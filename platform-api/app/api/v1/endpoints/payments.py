"""
Hosted checkout (SSLCommerz) endpoints.

Flow:
1. App creates an order: POST /payments (server prices it).
2. App starts checkout: POST /payments/{id}/checkout {return_url} -> gateway_url.
3. The phone browser pays on SSLCommerz, which posts back to
   /payments/sslcommerz/callback/{success|fail|cancel}.
4. On success the server validates the val_id with SSLCommerz (server-to-server),
   settles the order, then redirects the browser to the app's deep link.
5. The IPN endpoint performs the same validation for deployments with a public URL.
Browser-reported outcomes never change an order by themselves.
"""

from html import escape
from urllib.parse import urlencode, urlparse
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from app.api.deps import DatabaseDep, MemberDep
from app.api.v1.endpoints.management import record
from app.core.config import settings
from app.models.platform import Order
from app.services import billing

router = APIRouter()


class CheckoutInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    return_url: str = Field(min_length=6, max_length=1024)


def allowed_return_url(url: str) -> bool:
    allowed = {s.strip() for s in settings.PAYMENT_RETURN_SCHEMES.split(",") if s.strip()}
    return urlparse(url).scheme in allowed


def public_base(request: Request) -> str:
    return (settings.PUBLIC_API_BASE_URL or str(request.base_url)).rstrip("/")


@router.get("/payments/{id}")
async def get_order(id: uuid.UUID, db: DatabaseDep, user: MemberDep):
    order = await db.scalar(select(Order).where(Order.id == id, Order.user_id == user.id))
    if not order:
        raise HTTPException(404, "Order not found")
    return record(order)


@router.post("/payments/{id}/checkout")
async def checkout(id: uuid.UUID, data: CheckoutInput, request: Request, db: DatabaseDep, user: MemberDep):
    if not allowed_return_url(data.return_url):
        raise HTTPException(422, "Unsupported return URL")
    order = await db.scalar(select(Order).where(Order.id == id, Order.user_id == user.id).with_for_update())
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "pending":
        raise HTTPException(409, "This order is already closed")
    gateway = billing.SSLCommerzGateway()
    if order.provider != gateway.name or not gateway.available():
        raise HTTPException(409, "This order cannot be paid through SSLCommerz")

    base = public_base(request)
    gateway_url, session_key = await gateway.create_session(
        order, user,
        callback_base=f"{base}/api/v1/payments/sslcommerz/callback",
        ipn_url=f"{base}/api/v1/payments/sslcommerz/ipn",
    )
    order.gateway_session, order.return_url = session_key, data.return_url
    await db.commit()
    return {"order_id": str(order.id), "gateway_url": gateway_url}


def result_page(message: str) -> HTMLResponse:
    body = (
        "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
        "<body style='font-family:sans-serif;padding:32px;background:#FAF6F0;color:#1C1917'>"
        f"<h2>BornoVerse</h2><p>{escape(message)}</p><p>You can return to the app now.</p></body>"
    )
    return HTMLResponse(body)


@router.api_route("/payments/sslcommerz/callback/{outcome}", methods=["GET", "POST"], include_in_schema=False)
async def sslcommerz_callback(outcome: str, request: Request, db: DatabaseDep):
    if outcome not in {"success", "fail", "cancel"}:
        raise HTTPException(404, "Not found")
    form = dict(await request.form()) if request.method == "POST" else dict(request.query_params)
    order = None
    if outcome == "success":
        order = await billing.sslcommerz_validate_and_settle(db, str(form.get("val_id", "")))
    if order is None:
        try:
            order = await db.get(Order, uuid.UUID(str(form.get("tran_id", ""))))
        except ValueError:
            order = None
    if not order:
        return result_page("We could not match this payment to an order.")

    status = order.status if order.status != "pending" else ("pending" if outcome == "success" else outcome)
    if order.return_url and allowed_return_url(order.return_url):
        separator = "&" if "?" in order.return_url else "?"
        return RedirectResponse(
            f"{order.return_url}{separator}{urlencode({'order_id': str(order.id), 'status': status})}",
            status_code=303,
        )
    return result_page("Payment successful." if status == "success" else "Payment was not completed.")


@router.post("/payments/sslcommerz/ipn", include_in_schema=False)
async def sslcommerz_ipn(request: Request, db: DatabaseDep):
    form = dict(await request.form())
    order = await billing.sslcommerz_validate_and_settle(db, str(form.get("val_id", "")))
    return {"received": True, "status": order.status if order else "unknown"}
