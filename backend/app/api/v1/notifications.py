import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, or_, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import Customer, CustomerSession, CustomerSubscription, Notification, SessionStatus, SubscriptionStatus
from app.services.hours import get_customer_balance
from app.services.notify import notify_admins

router = APIRouter(prefix="/notifications", tags=["الإشعارات"])


@router.get("")
def list_notifications(db: DbSession, user: CurrentUser, unread_only: bool = False):
    q = select(Notification).where(
        or_(Notification.user_id.is_(None), Notification.user_id == user.id)
    ).order_by(Notification.created_at.desc()).limit(50)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    items = db.scalars(q).all()
    unread_count = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.is_read.is_(False),
            or_(Notification.user_id.is_(None), Notification.user_id == user.id),
        )
    ) or 0
    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "reference_type": n.reference_type,
                "reference_id": str(n.reference_id) if n.reference_id else None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ],
        "unread_count": unread_count,
    }


@router.delete("/{notification_id}")
def delete_notification(notification_id: str, db: DbSession, user: CurrentUser):
    note = db.get(Notification, uuid.UUID(notification_id))
    if not note:
        raise HTTPException(404, "الإشعار غير موجود")
    db.delete(note)
    db.commit()
    return {"message": "تم حذف الإشعار"}


@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str, db: DbSession, user: CurrentUser):
    note = db.get(Notification, uuid.UUID(notification_id))
    if not note:
        raise HTTPException(404, "الإشعار غير موجود")
    note.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(db: DbSession, user: CurrentUser):
    notes = db.scalars(
        select(Notification).where(
            Notification.is_read.is_(False),
            or_(Notification.user_id.is_(None), Notification.user_id == user.id),
        )
    ).all()
    for note in notes:
        note.is_read = True
    db.commit()
    return {"marked": len(notes)}


@router.post("/generate-alerts")
def generate_alerts(db: DbSession, user: CurrentUser):
    today = date.today()
    alerts = []

    expiring = db.scalars(
        select(CustomerSubscription).where(
            CustomerSubscription.status == SubscriptionStatus.ACTIVE.value,
            CustomerSubscription.end_date.isnot(None),
            CustomerSubscription.end_date <= today + timedelta(days=30),
        )
    ).all()
    for sub in expiring:
        days_left = (sub.end_date - today).days if sub.end_date else 0
        created = notify_admins(
            db,
            title="عقد قارب على الانتهاء",
            message=f"عقد العميل سينتهي خلال {days_left} يوم",
            notification_type="contract_expiring",
            reference_type="subscription",
            reference_id=sub.id,
        )
        alerts.extend(created)

    overdue_sessions = db.scalars(
        select(CustomerSession).where(
            CustomerSession.status == SessionStatus.CHECKED_IN.value,
            CustomerSession.check_out_at.is_(None),
            CustomerSession.check_in_at <= datetime.now(timezone.utc) - timedelta(hours=8),
        )
    ).all()
    for session in overdue_sessions:
        customer = db.get(Customer, session.customer_id)
        if not customer:
            continue
        created = notify_admins(
            db,
            title="جلسة حضور مفتوحة لفترة طويلة",
            message=f"العميل {customer.full_name} مسجّل حضوره منذ أكثر من 8 ساعات ولم يُسجّل انصرافه",
            notification_type="session_overdue",
            reference_type="session",
            reference_id=session.id,
        )
        alerts.extend(created)

    low_balance_customers = db.scalars(
        select(Customer).where(Customer.deleted_at.is_(None), Customer.status == "active")
    ).all()
    for customer in low_balance_customers:
        balance = get_customer_balance(db, customer.id)
        if 0 < balance < 2:
            created = notify_admins(
                db,
                title="رصيد ساعات منخفض",
                message=f"العميل {customer.full_name} رصيده {float(balance):.2f} ساعة فقط",
                notification_type="low_balance",
                reference_type="customer",
                reference_id=customer.id,
            )
            alerts.extend(created)

    db.commit()
    return {"generated": len(alerts)}
