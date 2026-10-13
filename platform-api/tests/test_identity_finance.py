from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import UUID
import hashlib
from sqlalchemy import select, func
from app.models import User
from app.models.platform import RecoveryToken, Order, EligibleView, Ledger, FinancialSnapshot
from tests.test_platform import account, public_book, admin, mock_payments

async def test_recovery_one_time_and_admin_login(client,db_session,admin):
    listener,headers=await account(client)
    token='one-time-recovery-code-for-tests'
    db_session.add(RecoveryToken(digest=hashlib.sha256(token.encode()).hexdigest(),user_id=UUID(listener['id']),expires_at=datetime.now(timezone.utc)+timedelta(minutes=10)))
    await db_session.commit()
    result=await client.post('/api/v1/auth/reset-password',json={'token':token,'password':'NewPassword123!'})
    assert result.status_code==200
    assert (await client.post('/api/v1/auth/reset-password',json={'token':token,'password':'OtherPassword123!'})).status_code==400
    assert (await client.get('/api/v1/users/me',headers=headers)).status_code==401
    result=await client.post('/api/v1/auth/admin-login',json={'username_or_email':'admin@example.com','password':'VeryStrongPassword!'})
    assert result.status_code==200
    assert result.json()['user']['account_type']=='admin'
    assert (await client.get('/api/v1/playlists',headers=admin)).status_code==403

async def test_financial_close_refund_and_reconciliation(client,db_session,owner_tokens,admin,mock_payments):
    listener,headers=await account(client)
    book=await public_book(db_session,owner_tokens['user'])
    order=Order(user_id=UUID(listener['id']),kind='subscription',months=1,amount=Decimal('150'),status='success',idempotency_key='financial-order',updated_at=datetime(2025,1,15,tzinfo=timezone.utc))
    db_session.add(order);db_session.add(EligibleView(user_id=UUID(listener['id']),audiobook_id=book.id,publisher_id=UUID(owner_tokens['user']['id']),month='2025-01'));await db_session.commit()
    body={'order_id':str(order.id),'amount':'10.00','kind':'refund','reason':'Development refund approved','reference':'refund-idempotent'}
    for _ in range(2):
        response=await client.post('/api/v1/admin/adjustments',headers=admin,json=body)
        assert response.status_code==200,response.text
    for _ in range(2):
        result=await client.post('/api/v1/admin/finance/close/2025-01',headers=admin)
        assert result.status_code==200,result.text
        assert Decimal(result.json()['revenue'])==Decimal('140')
        assert Decimal(result.json()['publisher_pool'])==Decimal('98')
        assert Decimal(result.json()['platform_share'])==Decimal('42')
    assert await db_session.scalar(select(func.count()).select_from(FinancialSnapshot))==1
    assert await db_session.scalar(select(func.count()).select_from(Ledger))==1
    assert (await client.post('/api/v1/admin/adjustments',headers=admin,json=body|{'reference':'after-close-refund'})).status_code==409
    summary=(await client.get('/api/v1/admin/finance',headers=admin)).json()
    assert Decimal(summary['reconciliation_difference'])==0
    assert Decimal(summary['refunds'])==10

async def test_playlist_isolation_and_reports(client,db_session,owner_tokens,other_tokens,admin):
    listener,headers=await account(client)
    book=await public_book(db_session,owner_tokens['user'],'free')
    playlist=(await client.post('/api/v1/playlists',headers=headers,json={'name':'Favorites'})).json()
    assert (await client.put(f"/api/v1/playlists/{playlist['id']}/books/{book.id}",headers=headers)).status_code==200
    assert (await client.get(f"/api/v1/playlists/{playlist['id']}/books",headers=other_tokens['headers'])).status_code==404
    report=(await client.post('/api/v1/reports',headers=headers,json={'audiobook_id':str(book.id),'reason':'Copyright ownership requires investigation'})).json()
    response=await client.post(f"/api/v1/admin/reports/{report['id']}/decision",headers=admin,json={'action':'resolve','reason':'Ownership documents verified'})
    assert response.status_code==200
    assert response.json()['status']=='resolve'
