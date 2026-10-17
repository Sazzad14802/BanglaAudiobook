"""
Notifications inbox / push tokens and the SSLCommerz hosted-checkout flow.
The gateway's HTTP calls are replaced with fakes; settlement logic is real.
"""

from decimal import Decimal
import uuid

from sqlalchemy import select

from app.core.config import settings
from app.models import User
from app.models.notification import Notification, PushToken
from app.models.platform import Plan, Order
from app.services import billing


async def listener(client, name="buyer"):
    reg = await client.post("/api/v1/auth/register", json={
        "username": name, "email": f"{name}@example.com", "password": "Password123!"})
    login = await client.post("/api/v1/auth/login", json={
        "username_or_email": f"{name}@example.com", "password": "Password123!"})
    return reg.json(), {"Authorization": f"Bearer {login.json()['access_token']}"}


# ── Notifications ────────────────────────────────────────────────────────────

async def test_inbox_is_private_and_read_state_works(client, db_session):
    me, headers = await listener(client, "alice")
    other, other_headers = await listener(client, "bob")
    db_session.add(Notification(user_id=uuid.UUID(me["id"]), kind="test", title="Hello", body="Body", data={}))
    db_session.add(Notification(user_id=uuid.UUID(other["id"]), kind="test", title="Not yours", body="", data={}))
    await db_session.commit()

    items = (await client.get("/api/v1/notifications", headers=headers)).json()
    assert [n["title"] for n in items] == ["Hello"]
    assert (await client.get("/api/v1/notifications/unread-count", headers=headers)).json() == {"count": 1}

    other_id = (await client.get("/api/v1/notifications", headers=other_headers)).json()[0]["id"]
    assert (await client.post(f"/api/v1/notifications/{other_id}/read", headers=headers)).status_code == 404

    read = await client.post(f"/api/v1/notifications/{items[0]['id']}/read", headers=headers)
    assert read.status_code == 200 and read.json()["read_at"]
    assert (await client.get("/api/v1/notifications/unread-count", headers=headers)).json() == {"count": 0}


async def test_push_token_follows_latest_account_and_logout_clears_it(client, db_session):
    _, alice = await listener(client, "alice")
    bob_user, bob = await listener(client, "bob")
    token = {"token": "ExponentPushToken[device-1]", "platform": "android"}

    assert (await client.post("/api/v1/notifications/push-tokens", headers=alice, json=token)).status_code == 204
    assert (await client.post("/api/v1/notifications/push-tokens", headers=bob, json=token)).status_code == 204
    rows = (await db_session.scalars(select(PushToken))).all()
    assert len(rows) == 1 and str(rows[0].user_id) == bob_user["id"]

    assert (await client.post("/api/v1/auth/logout", headers=bob)).status_code == 200
    db_session.expire_all()
    assert (await db_session.scalars(select(PushToken))).all() == []


# ── SSLCommerz checkout ──────────────────────────────────────────────────────

class FakeGateway(billing.SSLCommerzGateway):
    validation: dict = {}

    def available(self) -> bool:
        return True

    async def create_session(self, order, user, callback_base, ipn_url):
        FakeGateway.callback_base = callback_base
        return f"https://sandbox.sslcommerz.com/pay/{order.id}", "session-key"

    async def validate(self, val_id):
        return FakeGateway.validation


async def subscription_order(client, db_session, headers, monkeypatch):
    monkeypatch.setattr(billing, "SSLCommerzGateway", FakeGateway)
    plan = Plan(name="Monthly", months=1, price=Decimal("150.00"), active=True)
    db_session.add(plan)
    await db_session.commit()
    order = await client.post("/api/v1/payments", headers=headers, json={
        "kind": "subscription", "plan_id": str(plan.id), "idempotency_key": "checkout-1"})
    assert order.status_code == 200, order.text
    assert order.json()["provider"] == "sslcommerz"
    return order.json()


async def test_checkout_validates_and_grants_premium(client, db_session, monkeypatch):
    user, headers = await listener(client)
    order = await subscription_order(client, db_session, headers, monkeypatch)

    start = await client.post(f"/api/v1/payments/{order['id']}/checkout", headers=headers,
                              json={"return_url": "exp://192.168.0.5:8081/--/payment-result"})
    assert start.status_code == 200, start.text
    assert start.json()["gateway_url"].startswith("https://sandbox.sslcommerz.com/")

    FakeGateway.validation = {"status": "VALID", "tran_id": order["id"], "amount": "150.00",
                              "currency": "BDT", "risk_level": "0", "bank_tran_id": "B1"}
    callback = await client.post("/api/v1/payments/sslcommerz/callback/success",
                                 data={"val_id": "V1", "tran_id": order["id"]}, follow_redirects=False)
    assert callback.status_code == 303
    assert callback.headers["location"].startswith("exp://192.168.0.5:8081/--/payment-result?")
    assert "status=success" in callback.headers["location"]

    db_session.expire_all()
    account = await db_session.get(User, uuid.UUID(user["id"]))
    assert account.premium_until is not None
    notice = await db_session.scalar(select(Notification).where(Notification.user_id == account.id))
    assert notice.kind == "payment.success"

    # Replaying the callback (or the IPN) is idempotent.
    again = await client.post("/api/v1/payments/sslcommerz/ipn", data={"val_id": "V1"})
    assert again.json()["status"] == "success"


async def test_amount_mismatch_or_failure_never_settles(client, db_session, monkeypatch):
    user, headers = await listener(client)
    order = await subscription_order(client, db_session, headers, monkeypatch)
    await client.post(f"/api/v1/payments/{order['id']}/checkout", headers=headers,
                      json={"return_url": "bornoverse://payment-result"})

    FakeGateway.validation = {"status": "VALID", "tran_id": order["id"], "amount": "1.00", "currency": "BDT"}
    await client.post("/api/v1/payments/sslcommerz/callback/success", data={"val_id": "V2", "tran_id": order["id"]})
    fail = await client.post("/api/v1/payments/sslcommerz/callback/fail", data={"tran_id": order["id"]},
                             follow_redirects=False)
    assert "status=fail" in fail.headers["location"]

    status = (await client.get(f"/api/v1/payments/{order['id']}", headers=headers)).json()["status"]
    assert status == "pending"
    db_session.expire_all()
    assert (await db_session.get(User, uuid.UUID(user["id"]))).premium_until is None


async def test_checkout_rejects_web_redirects_and_foreign_orders(client, db_session, monkeypatch):
    _, headers = await listener(client, "owner")
    _, intruder = await listener(client, "intruder")
    order = await subscription_order(client, db_session, headers, monkeypatch)

    phishing = await client.post(f"/api/v1/payments/{order['id']}/checkout", headers=headers,
                                 json={"return_url": "https://evil.example.com/steal"})
    assert phishing.status_code == 422
    foreign = await client.post(f"/api/v1/payments/{order['id']}/checkout", headers=intruder,
                                json={"return_url": "bornoverse://payment-result"})
    assert foreign.status_code == 404
    assert (await client.get(f"/api/v1/payments/{order['id']}", headers=intruder)).status_code == 404


async def test_mock_confirm_cannot_settle_gateway_orders(client, db_session, monkeypatch):
    _, headers = await listener(client)
    order = await subscription_order(client, db_session, headers, monkeypatch)
    monkeypatch.setattr(settings, "MOCK_PAYMENTS_ENABLED", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    response = await client.post(f"/api/v1/payments/{order['id']}/mock-confirm", headers=headers,
                                 json={"status": "success"})
    assert response.status_code == 409


# ── Supabase Google sign-in ──────────────────────────────────────────────────

async def test_supabase_google_login_creates_and_reuses_account(client, monkeypatch):
    from app.api.v1.endpoints import identity

    async def google_identity(token):
        return {"email": "Reader@Gmail.com", "app_metadata": {"providers": ["google"]},
                "user_metadata": {"full_name": "Rahim Reader"}}

    monkeypatch.setattr(identity, "supabase_identity", google_identity)
    first = await client.post("/api/v1/auth/supabase", json={"access_token": "x" * 40})
    assert first.status_code == 200, first.text
    assert first.json()["user"]["email"] == "reader@gmail.com"
    assert first.json()["user"]["full_name"] == "Rahim Reader"

    again = await client.post("/api/v1/auth/supabase", json={"access_token": "y" * 40})
    assert again.json()["user"]["id"] == first.json()["user"]["id"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {again.json()['access_token']}"})
    assert me.status_code == 200


async def test_supabase_login_requires_google_identity(client, monkeypatch):
    from app.api.v1.endpoints import identity

    async def email_identity(token):
        return {"email": "someone@example.com", "app_metadata": {"providers": ["email"]}}

    monkeypatch.setattr(identity, "supabase_identity", email_identity)
    response = await client.post("/api/v1/auth/supabase", json={"access_token": "z" * 40})
    assert response.status_code == 401


async def test_supabase_login_unconfigured_is_503(client):
    response = await client.post("/api/v1/auth/supabase", json={"access_token": "z" * 40})
    assert response.status_code == 503
