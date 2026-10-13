"""Uses an isolated temporary schema; never clears the application's tables."""
import asyncio
import os
from uuid import uuid4
from decimal import Decimal
import pytest
from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from httpx import AsyncClient, ASGITransport
from app.core.config import settings
from app.core.database import get_db
from app.main import create_app
from app.models import Base, User, Audiobook
from app.models.platform import Setting, Plan, Order, Quota, PaymentEvent
from app.services.policy import DEFAULTS
from app.services.auth_service import create_user_token
from tests.test_platform import pdf

@pytest.mark.skipif(os.environ.get('RUN_PG_TESTS')!='1',reason='Set RUN_PG_TESTS=1 to run isolated PostgreSQL concurrency checks')
async def test_postgres_atomic_quota_and_payment(tmp_path,monkeypatch):
    assert settings.DATABASE_URL.startswith('postgresql'), 'PostgreSQL DATABASE_URL is required'
    schema='banglabook_test_'+uuid4().hex
    engine=create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    isolated=engine.execution_options(schema_translate_map={None:schema})
    sessions=async_sessionmaker(isolated,expire_on_commit=False)
    monkeypatch.setattr(settings,'UPLOAD_DIR',str(tmp_path))
    monkeypatch.setattr(settings,'MOCK_PAYMENTS_ENABLED',True)
    monkeypatch.setattr(settings,'ENVIRONMENT','development')
    try:
        async with isolated.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with sessions() as db:
            user=User(username='concurrent',email='concurrent@example.com',password_hash='not-used',account_type='listener')
            db.add(user);db.add(Setting(key='policy',value=DEFAULTS|{'free_quota':1}));await db.flush()
            books=[]
            for i in range(2):
                file=tmp_path/f'{i}.pdf';file.write_bytes(pdf())
                book=Audiobook(owner_id=user.id,title=f'Concurrent {i}',source_file_url=f'/uploads/{i}.pdf')
                db.add(book);books.append(book)
            plan=Plan(name='Monthly',months=1,price=Decimal('150'));db.add(plan);await db.commit()
            headers={'Authorization':'Bearer '+create_user_token(user).access_token}
            ids=[str(b.id) for b in books];plan_id=str(plan.id)
        app=create_app()
        async def session_override():
            async with sessions() as db:
                try:yield db
                finally:await db.rollback()
        app.dependency_overrides[get_db]=session_override
        async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
            results=await asyncio.gather(*[client.post(f'/api/v1/audiobooks/{id}/generate',headers=headers) for id in ids])
            assert sorted(r.status_code for r in results)==[202,429],[r.text for r in results]
            results=await asyncio.gather(*[client.post('/api/v1/payments',headers=headers,json={'kind':'subscription','plan_id':plan_id,'idempotency_key':'concurrent-order'}) for _ in range(4)])
            assert all(r.status_code==200 for r in results),[r.text for r in results]
            assert len({r.json()['id'] for r in results})==1
            order_id=results[0].json()['id']
            results=await asyncio.gather(*[client.post(f'/api/v1/payments/{order_id}/mock-confirm',headers=headers,json={'status':'success'}) for _ in range(4)])
            assert all(r.status_code==200 for r in results),[r.text for r in results]
        async with sessions() as db:
            assert await db.scalar(select(func.sum(Quota.used)))==1
            assert await db.scalar(select(func.count()).select_from(Order))==1
            assert await db.scalar(select(func.count()).select_from(PaymentEvent).where(PaymentEvent.status=='success'))==1
    finally:
        async with engine.begin() as connection:
            # schema is generated above from a fixed prefix and UUID, never user input.
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await engine.dispose()
