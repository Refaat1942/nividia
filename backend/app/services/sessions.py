import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Customer, CustomerSession, CustomerStatus, HoursTransactionType, SessionStatus
from app.services.hours import add_hours_transaction, get_customer_balance, get_hours_summary


def calculate_billable_hours(duration_minutes: int) -> Decimal:
    if duration_minutes <= 0:
        return Decimal("0")
    blocks = math.ceil(duration_minutes / 15)
    return Decimal(str(blocks * 0.25)).quantize(Decimal("0.01"))


def get_active_session(db: Session, customer_id: uuid.UUID) -> CustomerSession | None:
    return db.scalar(
        select(CustomerSession).where(
            CustomerSession.customer_id == customer_id,
            CustomerSession.status == SessionStatus.CHECKED_IN.value,
            CustomerSession.check_out_at.is_(None),
        )
    )


def check_in_customer(
    db: Session,
    *,
    customer_id: uuid.UUID,
    staff_id: uuid.UUID,
    office_id: uuid.UUID | None = None,
    room_id: uuid.UUID | None = None,
    notes: str | None = None,
) -> CustomerSession:
    customer = db.get(Customer, customer_id)
    if not customer or customer.deleted_at:
        raise ValueError("العميل غير موجود")
    if customer.status != CustomerStatus.ACTIVE.value:
        raise ValueError("العميل غير نشط")

    if get_active_session(db, customer_id):
        raise ValueError("العميل مسجّل حضوره بالفعل")

    balance = get_customer_balance(db, customer_id)
    if balance <= 0:
        raise ValueError("لا يوجد رصيد ساعات متاح للعميل")

    session = CustomerSession(
        customer_id=customer_id,
        office_id=office_id,
        room_id=room_id,
        check_in_at=datetime.now(timezone.utc),
        status=SessionStatus.CHECKED_IN.value,
        notes=notes,
        checked_in_by=staff_id,
    )
    db.add(session)
    db.flush()
    return session


def check_out_customer(
    db: Session,
    *,
    session_id: uuid.UUID,
    staff_id: uuid.UUID,
    notes: str | None = None,
) -> CustomerSession:
    session = db.get(CustomerSession, session_id)
    if not session:
        raise ValueError("الجلسة غير موجودة")
    if session.status != SessionStatus.CHECKED_IN.value or session.check_out_at:
        raise ValueError("الجلسة منتهية بالفعل")

    now = datetime.now(timezone.utc)
    check_in = session.check_in_at
    if check_in.tzinfo is None:
        check_in = check_in.replace(tzinfo=timezone.utc)
    duration_minutes = max(0, int((now - check_in).total_seconds() // 60))
    hours = calculate_billable_hours(duration_minutes)

    tx = None
    if hours > 0:
        tx = add_hours_transaction(
            db,
            customer_id=session.customer_id,
            amount=-hours,
            transaction_type=HoursTransactionType.USAGE.value,
            reason=f"جلسة حضور {duration_minutes} دقيقة",
            reference_type="session",
            reference_id=session.id,
            created_by=staff_id,
        )

    session.check_out_at = now
    session.duration_minutes = duration_minutes
    session.hours_deducted = hours
    session.hours_transaction_id = tx.id if tx else None
    session.status = SessionStatus.CHECKED_OUT.value
    session.checked_out_by = staff_id
    if notes:
        session.notes = (session.notes or "") + ("\n" if session.notes else "") + notes
    db.flush()
    return session


def session_to_dict(session: CustomerSession, customer: Customer | None = None, include_live: bool = False) -> dict:
    data = {
        "id": str(session.id),
        "customer_id": str(session.customer_id),
        "customer_name": customer.full_name if customer else None,
        "customer_code": customer.customer_code if customer else None,
        "customer_phone": customer.phone if customer else None,
        "office_id": str(session.office_id) if session.office_id else None,
        "room_id": str(session.room_id) if session.room_id else None,
        "check_in_at": session.check_in_at.isoformat() if session.check_in_at else None,
        "check_out_at": session.check_out_at.isoformat() if session.check_out_at else None,
        "duration_minutes": session.duration_minutes,
        "hours_deducted": float(session.hours_deducted) if session.hours_deducted else None,
        "status": session.status,
        "notes": session.notes,
        "checked_in_by": str(session.checked_in_by) if session.checked_in_by else None,
        "checked_out_by": str(session.checked_out_by) if session.checked_out_by else None,
    }
    if include_live and session.status == SessionStatus.CHECKED_IN.value and session.check_in_at:
        check_in = session.check_in_at
        if check_in.tzinfo is None:
            check_in = check_in.replace(tzinfo=timezone.utc)
        elapsed = max(0, int((datetime.now(timezone.utc) - check_in).total_seconds() // 60))
        data["elapsed_minutes"] = elapsed
        data["estimated_hours"] = float(calculate_billable_hours(elapsed))
    return data


def get_customer_session_summary(db: Session, customer_id: uuid.UUID) -> dict:
    hours = get_hours_summary(db, customer_id)
    active = get_active_session(db, customer_id)
    return {
        **hours,
        "is_checked_in": active is not None,
        "active_session_id": str(active.id) if active else None,
    }
