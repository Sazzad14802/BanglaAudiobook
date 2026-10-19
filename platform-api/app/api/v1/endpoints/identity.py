import asyncio
import hashlib
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta
import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from app.api.deps import DatabaseDep, CurrentUserDep
from app.core.config import settings
from app.core.security import hash_password
from app.models import User
from app.models.platform import RecoveryToken
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth_service import authenticate_user, create_user_token, get_user_by_email
from app.services.policy import utc, audit

router = APIRouter()

@router.post("/admin-login")
async def admin_login(data: LoginRequest, db: DatabaseDep):
    user = await authenticate_user(db, data.username_or_email, data.password, "admin")
    return create_user_token(user)

@router.post("/logout")
async def logout(db: DatabaseDep, user: CurrentUserDep):
    from sqlalchemy import delete
    from app.models.notification import PushToken
    user.token_version += 1
    # Revoked sessions must stop receiving pushes on every device.
    await db.execute(delete(PushToken).where(PushToken.user_id == user.id))
    await db.commit()
    return {"message": "All sessions revoked"}

class RecoveryRequest(BaseModel):
    email: str = Field(max_length=255)

class ResetRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=6, max_length=72)

def send_recovery(email, token):
    message = EmailMessage()
    message["From"], message["To"], message["Subject"] = settings.MAIL_FROM, email, "Reset your BornoVerse password"
    message.set_content(f"Your one-time reset code (expires in 20 minutes):\n{token}\n\nOpen BornoVerse > Forgot password > Reset with code.")
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)

@router.post("/recovery")
async def recover(data: RecoveryRequest, db: DatabaseDep):
    if not settings.SMTP_HOST:
        raise HTTPException(503, "Password recovery email is not configured")
    user = await get_user_by_email(db, data.email.strip().lower())
    if user and user.account_type == "user":
        token = secrets.token_urlsafe(32)
        db.add(RecoveryToken(digest=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=20)))
        await asyncio.to_thread(send_recovery, user.email, token)
        await db.commit()
    return {"message": "If this account exists, a recovery email has been sent."}

@router.post("/reset-password")
async def reset(data: ResetRequest, db: DatabaseDep):
    if len(data.password.encode()) > 72:
        raise HTTPException(422, "Password exceeds 72 UTF-8 bytes")
    row = await db.scalar(select(RecoveryToken).where(RecoveryToken.digest == hashlib.sha256(data.token.encode()).hexdigest()).with_for_update())
    if not row or row.used or utc(row.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(400, "Invalid or expired recovery code")
    user = await db.get(User, row.user_id)
    user.password_hash = hash_password(data.password)
    user.token_version += 1
    row.used = True
    audit(db, user, "password.reset", user.id)
    await db.commit()
    return {"message": "Password reset. Sign in again."}

class GoogleRequest(BaseModel):
    id_token: str = Field(max_length=10000)

def google_claims(token):
    if not settings.GOOGLE_CLIENT_IDS:
        raise HTTPException(503, "Google sign-in is not configured")
    try:
        key = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs").get_signing_key_from_jwt(token)
        claims = jwt.decode(token, key.key, algorithms=["RS256"], audience=settings.GOOGLE_CLIENT_IDS.split(","))
        if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"} or claims.get("email_verified") is not True:
            raise ValueError("Unverified Google identity")
        return claims
    except Exception:
        raise HTTPException(401, "Invalid Google identity token")

class SupabaseRequest(BaseModel):
    access_token: str = Field(min_length=20, max_length=10000)


async def supabase_identity(access_token: str) -> dict:
    """Ask Supabase Auth who this token belongs to (server-side validation)."""
    import httpx
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(503, "Google sign-in is not configured")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={"Authorization": f"Bearer {access_token}", "apikey": settings.SUPABASE_ANON_KEY},
            )
    except httpx.HTTPError:
        raise HTTPException(502, "Identity provider is unreachable")
    if response.status_code != 200:
        raise HTTPException(401, "Invalid or expired Google sign-in")
    return response.json()


@router.post("/supabase", summary="Exchange a Supabase Google session for a BornoVerse session")
async def supabase_login(data: SupabaseRequest, db: DatabaseDep):
    identity = await supabase_identity(data.access_token)
    providers = set((identity.get("app_metadata") or {}).get("providers") or [])
    email = (identity.get("email") or "").strip().lower()
    # Only identities verified by Google may sign in, so the email is proven.
    if "google" not in providers or not email:
        raise HTTPException(401, "A verified Google account is required")
    user = await get_user_by_email(db, email)
    if user and user.account_type != "user":
        raise HTTPException(403, "Use the admin portal for administrator accounts")
    if not user:
        from app.services.auth_service import register_user
        metadata = identity.get("user_metadata") or {}
        base = "".join(ch for ch in email.split("@")[0].lower() if ch.isalnum() or ch == "_")[:30] or "user"
        user = await register_user(db, RegisterRequest(
            email=email, username=f"{base}_{secrets.token_hex(3)}", password=secrets.token_urlsafe(32)[:60],
            full_name=(metadata.get("full_name") or metadata.get("name") or "")[:150]))
        audit(db, user, "account.google_signup", user.id)
        await db.commit()
    if user.suspended:
        raise HTTPException(403, "Account suspended")
    return create_user_token(user)


@router.post("/google")
async def google(data: GoogleRequest, db: DatabaseDep):
    claims = await asyncio.to_thread(google_claims, data.id_token)
    user = await get_user_by_email(db, claims["email"])
    if user and user.account_type != "user":
        raise HTTPException(403, "Use the admin portal for administrator accounts")
    if not user:
        from app.services.auth_service import register_user
        user = await register_user(db, RegisterRequest(email=claims["email"],
            username="google_" + secrets.token_hex(8), password=secrets.token_urlsafe(32),
            full_name=claims.get("name", "")))
    if user.suspended:
        raise HTTPException(403, "Account suspended")
    return create_user_token(user)
