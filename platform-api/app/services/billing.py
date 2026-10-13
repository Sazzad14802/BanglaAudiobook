"""All amounts and entitlements are computed inside the server transaction."""
import calendar
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from abc import ABC, abstractmethod
from fastapi import HTTPException
from sqlalchemy import select, func
from app.core.config import settings
from app.models import User
from app.models.platform import Order, Plan, PaymentEvent, FinancialSnapshot, Ledger, EligibleView, Withdrawal
from app.models.platform import FinancialAdjustment
from app.services.policy import configuration, audit, utc, month_now

class PaymentGateway(ABC):
    @abstractmethod
    def confirm(self, outcome: str) -> str: ...

class MockGateway(PaymentGateway):
    def confirm(self, outcome: str) -> str:
        if settings.ENVIRONMENT != "development" or not settings.MOCK_PAYMENTS_ENABLED:
            raise HTTPException(503, "Development payments are disabled")
        return outcome

def add_months(value, months):
    year, month = divmod(value.year * 12 + value.month - 1 + months, 12)
    return value.replace(year=year, month=month + 1,
                         day=min(value.day, calendar.monthrange(year, month + 1)[1]))

async def initiate(db, user, data):
    MockGateway().confirm("pending")
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    existing = await db.scalar(select(Order).where(Order.user_id == user.id, Order.idempotency_key == data.idempotency_key))
    if existing:
        if existing.kind != data.kind or existing.plan_id != data.plan_id:
            raise HTTPException(409, "Idempotency key already used for a different order")
        return existing
    months = 0
    if data.kind == "subscription":
        if user.account_type != "listener":
            raise HTTPException(403, "Listener account required")
        plan = await db.get(Plan, data.plan_id) if data.plan_id else None
        if not plan or not plan.active:
            raise HTTPException(404, "Active subscription plan not found")
        amount, months = plan.price, plan.months
    else:
        if data.plan_id or user.account_type != "publisher" or user.publisher_status != "approved_pending_payment":
            raise HTTPException(403, "Publisher approval required before payment")
        amount = Decimal(str((await configuration(db))["publisher_fee"]))
    order = Order(user_id=user.id, kind=data.kind, plan_id=data.plan_id, months=months,
                  amount=amount, idempotency_key=data.idempotency_key)
    db.add(order)
    await db.flush()
    db.add(PaymentEvent(order_id=order.id, status="pending"))
    audit(db, user, "payment.initiate", order.id, amount=str(amount))
    await db.commit()
    return order

async def confirm(db, user, order_id, outcome):
    outcome = MockGateway().confirm(outcome)
    # Lock account before order everywhere, including initiation, to avoid deadlocks.
    account = await db.scalar(select(User).where(User.id == user.id).with_for_update().execution_options(populate_existing=True))
    order = await db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id).with_for_update())
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "pending":
        if order.status != outcome:
            raise HTTPException(409, "Order has already reached a different terminal state")
        return order
    if outcome == "success":
        if order.kind == "publisher_registration":
            if account.publisher_status != "approved_pending_payment":
                raise HTTPException(409, "Publisher is no longer eligible for activation")
            account.publisher_status = "active"
        else:
            now = datetime.now(timezone.utc)
            start = max(now, utc(account.premium_until)) if account.premium_until else now
            account.premium_until = add_months(start, order.months)
            account.subscription_cancelled = False
    order.status = outcome
    order.updated_at = datetime.now(timezone.utc)
    db.add(PaymentEvent(order_id=order.id, status=outcome))
    audit(db, user, "payment." + outcome, order.id, amount=str(order.amount))
    await db.commit()
    return order

def allocate(pool, counts):
    """Largest remainder in paisa; deterministic UUID ordering breaks ties."""
    total = sum(counts.values())
    if not total:
        return {}
    cents = int(pool * 100)
    raw = {key: Decimal(cents) * count / total for key, count in counts.items()}
    result = {key: int(value.to_integral_value(rounding=ROUND_DOWN)) for key, value in raw.items()}
    remainder = cents - sum(result.values())
    for key in sorted(raw, key=lambda k: (-(raw[k] - result[k]), str(k)))[:remainder]:
        result[key] += 1
    return {key: Decimal(value) / 100 for key, value in result.items()}

async def close_month(db, actor, month):
    from zoneinfo import ZoneInfo
    import re
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month) or month >= month_now():
        raise HTTPException(400, "Only a completed calendar month can be closed")
    # Serialize closes using the existing policy row.
    from app.models.platform import Setting
    await db.execute(select(Setting).where(Setting.key == "policy").with_for_update())
    prior = await db.get(FinancialSnapshot, month)
    if prior:
        return prior
    start = datetime.strptime(month, "%Y-%m").replace(tzinfo=ZoneInfo("Asia/Dhaka"))
    end = add_months(start, 1)
    revenue = await db.scalar(select(func.coalesce(func.sum(Order.amount), 0)).where(
        Order.status == "success", Order.kind == "subscription", Order.updated_at >= start, Order.updated_at < end))
    policy = await configuration(db)
    deductions = await db.scalar(select(func.coalesce(func.sum(FinancialAdjustment.amount), 0)).join(
        Order, Order.id == FinancialAdjustment.order_id).where(
        FinancialAdjustment.month == month, Order.kind == "subscription"))
    revenue -= deductions
    pool = (revenue * Decimal(policy["publisher_percent"]) / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    counts = dict((await db.execute(select(EligibleView.publisher_id, func.count()).where(
        EligibleView.month == month).group_by(EligibleView.publisher_id))).all())
    allocations = allocate(pool, counts)
    # No eligible plays: keep the pool as an unallocated liability, never platform income.
    snapshot = FinancialSnapshot(month=month, revenue=revenue, publisher_pool=pool,
        platform_share=revenue - pool, policy=policy | {"unallocated": str(pool - sum(allocations.values()))})
    db.add(snapshot)
    for publisher, amount in allocations.items():
        db.add(Ledger(publisher_id=publisher, month=month, amount=amount, kind="earning", reference=f"earning:{month}:{publisher}"))
    audit(db, actor, "finance.close_month", month, revenue=str(revenue), pool=str(pool))
    await db.commit()
    return snapshot

async def balance(db, publisher_id):
    earned = await db.scalar(select(func.coalesce(func.sum(Ledger.amount), 0)).where(Ledger.publisher_id == publisher_id))
    reserved = await db.scalar(select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
        Withdrawal.publisher_id == publisher_id, Withdrawal.status.in_(["pending", "approved"])))
    return earned - reserved
