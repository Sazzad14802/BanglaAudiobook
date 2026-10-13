"""Explicit local operator command; no public administrator registration."""
import asyncio
import getpass
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models import User
from app.core.security import hash_password
from app.schemas.auth import RegisterRequest

async def main():
    email = input("Administrator email: ").strip().lower()
    username = input("Administrator username: ").strip()
    password = getpass.getpass("Administrator password (12+ characters): ")
    RegisterRequest(email=email, username=username, password=password)
    if len(password) < 12:
        raise ValueError("Administrator password must contain at least 12 characters")
    async with async_session_maker() as db:
        if await db.scalar(select(User.id).where(User.email == email, User.account_type == "admin")):
            raise ValueError("Administrator already exists")
        db.add(User(email=email, username=username, password_hash=hash_password(password), account_type="admin"))
        await db.commit()
    print("Administrator created")

if __name__ == "__main__":
    asyncio.run(main())
