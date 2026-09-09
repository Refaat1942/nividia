import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func, or_, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Customer, CustomerSession, SessionStatus
from app.services.audit import log_audit
from app.services.hours import get_customer_balance, get_hours_summary
from app.services.notify import notify_admins
from app.services.sessions import (
    check_in_customer,
    check_out_customer,
    get_active_session,
    get_customer_session_summary,
    session_to_dict,
)

router = APIRouter(prefix="/sessions", tags=["الحضور والانصراف"])


class CheckInRequest(BaseModel):
    customer_id: uuid.UUID
    office_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    notes: str | None = None


class CheckOutRequest(BaseModel):
    notes: str | None = None


@router.get("")
def list_sessions(
    db: DbSession,
    user: CurrentUser,
    session_date: str | None = None,
    customer_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = Query(100, le=500),
):
    q = select(CustomerSession, Customer).join(Customer, CustomerSession.customer_id == Customer.id)
    if session_date:
        day = date.fromisoformat(session_date)
        q = q.where(func.date(CustomerSession.check_in_at) == day)
    if customer_id:
        q = q.where(CustomerSession.customer_id == customer_id)
    if status:
        q = q.where(CustomerSession.status == status)
    rows = db.execute(q.order_by(CustomerSession.check_in_at.desc()).limit(limit)).all()
    items = [session_to_dict(s, c, include_live=True) for s, c in rows]
    return {"items": items}


@router.get("/active")
def list_active_sessions(db: DbSession, user: CurrentUser):
    rows = db.execute(
        select(CustomerSession, Customer).join(Customer, CustomerSession.customer_id == Customer.id).where(
            CustomerSession.status == SessionStatus.CHECKED_IN.value,
            CustomerSession.check_out_at.is_(None),
        ).order_by(CustomerSession.check_in_at)
    ).all()
    items = []
    for session, customer in rows:
        hours = get_hours_summary(db, customer.id)
        data = session_to_dict(session, customer, include_live=True)
        data["remaining_hours"] = hours["remaining_hours"]
        data["remaining_time"] = hours["remaining_time"]
        items.append(data)
    return {"items": items, "count": len(items)}


@router.get("/lookup")
def lookup_customer_session(db: DbSession, user: CurrentUser, q: str = Query(..., min_length=2)):
    """Quick reception lookup: is the customer here and how long."""
    term = f"%{q.strip()}%"
    customers = db.scalars(
        select(Customer).where(
            Customer.deleted_at.is_(None),
            or_(
                Customer.full_name.ilike(term),
                Customer.phone.ilike(term),
                Customer.customer_code.ilike(term),
            ),
        ).order_by(Customer.full_name).limit(8)
    ).all()
    items = []
    for customer in customers:
        hours = get_hours_summary(db, customer.id)
        active = get_active_session(db, customer.id)
        entry = {
            "customer_id": str(customer.id),
            "customer_name": customer.full_name,
            "customer_phone": customer.phone,
            "customer_code": customer.customer_code,
            "is_checked_in": active is not None,
            "remaining_hours": hours["remaining_hours"],
            "remaining_time": hours["remaining_time"],
            "session": None,
        }
        if active:
            session_data = session_to_dict(active, customer, include_live=True)
            entry["session"] = session_data
            entry["check_in_at"] = session_data.get("check_in_at")
            entry["elapsed_seconds"] = session_data.get("elapsed_seconds", 0)
            entry["elapsed_time"] = session_data.get("elapsed_time")
            entry["estimated_hours"] = session_data.get("estimated_hours")
        items.append(entry)
    return {"items": items, "query": q.strip()}


@router.get("/summary/{customer_id}")
def customer_session_summary(customer_id: uuid.UUID, db: DbSession, user: CurrentUser):
    customer = db.get(Customer, customer_id)
    if not customer or customer.deleted_at:
        raise HTTPException(404, "العميل غير موجود")
    return get_customer_session_summary(db, customer_id)


@router.post("/check-in", status_code=201)
def session_check_in(data: CheckInRequest, request: Request, db: DbSession, user: CurrentUser):
    try:
        session = check_in_customer(
            db,
            customer_id=data.customer_id,
            staff_id=user.id,
            office_id=data.office_id,
            room_id=data.room_id,
            notes=data.notes,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    customer = db.get(Customer, data.customer_id)
    balance = get_customer_balance(db, data.customer_id)
    notify_admins(
        db,
        title="تسجيل حضور عميل",
        message=f"تم تسجيل حضور {customer.full_name} ({customer.customer_code}). الرصيد المتبقي: {float(balance):.2f} ساعة",
        notification_type="session_checkin",
        reference_type="session",
        reference_id=session.id,
    )
    if balance < Decimal("2"):
        notify_admins(
            db,
            title="تنبيه: رصيد ساعات منخفض",
            message=f"العميل {customer.full_name} رصيده {float(balance):.2f} ساعة فقط",
            notification_type="low_balance",
            reference_type="customer",
            reference_id=customer.id,
        )

    log_audit(
        db, user_id=user.id, action="check_in", module="sessions",
        record_id=str(session.id), new_value={"customer_id": str(data.customer_id)},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(session)
    return session_to_dict(session, customer, include_live=True)


@router.post("/{session_id}/check-out")
def session_check_out(session_id: uuid.UUID, data: CheckOutRequest, request: Request, db: DbSession, user: CurrentUser):
    try:
        session = check_out_customer(db, session_id=session_id, staff_id=user.id, notes=data.notes)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    customer = db.get(Customer, session.customer_id)
    balance = get_customer_balance(db, session.customer_id)
    notify_admins(
        db,
        title="تسجيل انصراف عميل",
        message=(
            f"انصراف {customer.full_name}: {session.duration_minutes} دقيقة، "
            f"خصم {float(session.hours_deducted or 0):.2f} ساعة. المتبقي: {float(balance):.2f} ساعة"
        ),
        notification_type="session_checkout",
        reference_type="session",
        reference_id=session.id,
    )
    if balance < Decimal("2"):
        notify_admins(
            db,
            title="تنبيه: رصيد ساعات منخفض",
            message=f"بعد انصراف {customer.full_name}، الرصيد المتبقي {float(balance):.2f} ساعة فقط",
            notification_type="low_balance",
            reference_type="customer",
            reference_id=customer.id,
        )

    log_audit(
        db, user_id=user.id, action="check_out", module="sessions",
        record_id=str(session.id),
        new_value={"hours_deducted": float(session.hours_deducted or 0)},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(session)
    return session_to_dict(session, customer)
