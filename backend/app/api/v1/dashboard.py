from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import (
    Contract,
    Customer,
    CustomerStatus,
    CustomerSubscription,
    HoursTransaction,
    HoursTransactionType,
    Office,
    Payment,
    PaymentStatus,
    Room,
    RoomBooking,
    SubscriptionStatus,
)

router = APIRouter(prefix="/dashboard", tags=["لوحة التحكم"])


@router.get("/stats")
def dashboard_stats(db: DbSession, user: CurrentUser):
    today = date.today()
    in_30 = today + timedelta(days=30)
    total_customers = db.scalar(select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None))) or 0
    active_customers = db.scalar(
        select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None), Customer.status == CustomerStatus.ACTIVE.value)
    ) or 0
    active_contracts = db.scalar(
        select(func.count()).select_from(CustomerSubscription).where(CustomerSubscription.status == SubscriptionStatus.ACTIVE.value)
    ) or 0
    expiring_contracts = db.scalar(
        select(func.count()).select_from(CustomerSubscription).where(
            CustomerSubscription.status == SubscriptionStatus.ACTIVE.value,
            CustomerSubscription.end_date.isnot(None),
            CustomerSubscription.end_date <= in_30,
            CustomerSubscription.end_date >= today,
        )
    ) or 0
    available_offices = db.scalar(select(func.count()).select_from(Office).where(Office.status == "available", Office.deleted_at.is_(None))) or 0
    occupied_offices = db.scalar(select(func.count()).select_from(Office).where(Office.status == "occupied", Office.deleted_at.is_(None))) or 0
    available_rooms = db.scalar(select(func.count()).select_from(Room).where(Room.status == "available", Room.deleted_at.is_(None))) or 0
    today_bookings = db.scalar(
        select(func.count()).select_from(RoomBooking).where(RoomBooking.booking_date == today, RoomBooking.deleted_at.is_(None))
    ) or 0
    monthly_revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.PAID.value,
            func.extract("month", Payment.payment_date) == today.month,
            func.extract("year", Payment.payment_date) == today.year,
        )
    ) or 0
    annual_revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.PAID.value,
            func.extract("year", Payment.payment_date) == today.year,
        )
    ) or 0
    used_hours = db.scalar(
        select(func.coalesce(func.sum(func.abs(HoursTransaction.amount)), 0)).where(
            HoursTransaction.transaction_type == HoursTransactionType.USAGE.value
        )
    ) or 0
    remaining_hours = db.scalar(select(func.coalesce(func.sum(HoursTransaction.amount), 0)).select_from(HoursTransaction)) or 0
    bonus_hours = db.scalar(
        select(func.coalesce(func.sum(HoursTransaction.amount), 0)).where(
            HoursTransaction.transaction_type == HoursTransactionType.BONUS.value
        )
    ) or 0
    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "active_contracts": active_contracts,
        "expiring_contracts": expiring_contracts,
        "available_offices": available_offices,
        "occupied_offices": occupied_offices,
        "available_rooms": available_rooms,
        "today_bookings": today_bookings,
        "monthly_revenue": float(monthly_revenue),
        "annual_revenue": float(annual_revenue),
        "used_hours": float(used_hours),
        "remaining_hours": float(remaining_hours),
        "bonus_hours": float(bonus_hours),
    }


@router.get("/charts")
def dashboard_charts(db: DbSession, user: CurrentUser):
    today = date.today()
    revenue_by_month = []
    for i in range(5, -1, -1):
        d = today.replace(day=1) - timedelta(days=i * 30)
        month = d.month
        year = d.year
        rev = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status == PaymentStatus.PAID.value,
                func.extract("month", Payment.payment_date) == month,
                func.extract("year", Payment.payment_date) == year,
            )
        ) or 0
        revenue_by_month.append({"month": f"{year}-{month:02d}", "revenue": float(rev)})
    package_dist = db.execute(
        select(CustomerSubscription.subscription_type, func.count()).group_by(CustomerSubscription.subscription_type)
    ).all()
    return {
        "revenue_by_month": revenue_by_month,
        "package_distribution": [{"type": r[0], "count": r[1]} for r in package_dist],
        "office_occupancy": {"available": db.scalar(select(func.count()).where(Office.status == "available")) or 0,
                             "occupied": db.scalar(select(func.count()).where(Office.status == "occupied")) or 0},
    }
