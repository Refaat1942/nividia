import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import HoursTransaction, HoursTransactionType
from app.utils.time_format import breakdown_hours

settings = get_settings()


def get_customer_balance(db: Session, customer_id: uuid.UUID) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(HoursTransaction.amount), 0)).where(
            HoursTransaction.customer_id == customer_id
        )
    )
    return Decimal(str(total or 0))


def get_hours_summary(db: Session, customer_id: uuid.UUID) -> dict:
    rows = db.scalars(
        select(HoursTransaction).where(HoursTransaction.customer_id == customer_id)
    ).all()
    package_hours = Decimal("0")
    bonus_hours = Decimal("0")
    adjustments = Decimal("0")
    used_hours = Decimal("0")

    for row in rows:
        if row.transaction_type == HoursTransactionType.PACKAGE.value:
            package_hours += row.amount
        elif row.transaction_type == HoursTransactionType.BONUS.value:
            bonus_hours += row.amount
        elif row.transaction_type in (
            HoursTransactionType.ADJUSTMENT.value,
            HoursTransactionType.CORRECTION.value,
            HoursTransactionType.REFUND.value,
        ):
            adjustments += row.amount
        elif row.transaction_type == HoursTransactionType.USAGE.value:
            used_hours += abs(row.amount) if row.amount < 0 else row.amount

    total_available = package_hours + bonus_hours + adjustments
    remaining = get_customer_balance(db, customer_id)

    remaining_f = float(remaining)
    used_f = float(used_hours)
    return {
        "package_hours": float(package_hours),
        "bonus_hours": float(bonus_hours),
        "adjustments": float(adjustments),
        "used_hours": used_f,
        "total_available": float(total_available),
        "remaining_hours": remaining_f,
        "remaining_time": breakdown_hours(remaining_f),
        "used_time": breakdown_hours(used_f),
    }


def add_hours_transaction(
    db: Session,
    *,
    customer_id: uuid.UUID,
    amount: Decimal,
    transaction_type: str,
    reason: str | None = None,
    reference_type: str | None = None,
    reference_id: uuid.UUID | None = None,
    created_by: uuid.UUID | None = None,
    allow_negative: bool = False,
) -> HoursTransaction:
    current = get_customer_balance(db, customer_id)
    new_balance = current + amount

    if new_balance < 0 and not (allow_negative or settings.ALLOW_NEGATIVE_HOURS):
        raise ValueError("رصيد الساعات غير كافي")

    tx = HoursTransaction(
        customer_id=customer_id,
        amount=amount,
        transaction_type=transaction_type,
        reason=reason,
        reference_type=reference_type,
        reference_id=reference_id,
        balance_after=new_balance,
        created_by=created_by,
    )
    db.add(tx)
    db.flush()
    return tx
