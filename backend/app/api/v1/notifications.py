from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import CustomerSubscription, HoursTransaction, Notification, SubscriptionStatus
from app.services.hours import get_customer_balance

router = APIRouter(prefix="/notifications", tags=["الإشعارات"])


@router.get("")
def list_notifications(db: DbSession, user: CurrentUser, unread_only: bool = False):
    q = select(Notification).order_by(Notification.created_at.desc()).limit(50)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    return {"items": db.scalars(q).all()}


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
        n = Notification(
            title="عقد قارب على الانتهاء",
            message=f"عقد العميل سينتهي خلال {days_left} يوم",
            notification_type="contract_expiring",
            reference_type="subscription",
            reference_id=sub.id,
        )
        db.add(n)
        alerts.append(n)
    db.commit()
    return {"generated": len(alerts)}
