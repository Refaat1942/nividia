import io
from datetime import date

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import AuditLog, Customer, HoursTransaction, Payment, RoomBooking

router = APIRouter(prefix="/reports", tags=["التقارير"])


@router.get("/customers")
def customers_report(db: DbSession, user: CurrentUser, status: str | None = None):
    q = select(Customer).where(Customer.deleted_at.is_(None))
    if status:
        q = q.where(Customer.status == status)
    return {"items": db.scalars(q).all()}


@router.get("/hours-usage")
def hours_report(db: DbSession, user: CurrentUser, customer_id: str | None = None):
    q = select(HoursTransaction)
    if customer_id:
        q = q.where(HoursTransaction.customer_id == customer_id)
    return {"items": db.scalars(q.order_by(HoursTransaction.created_at.desc())).all()}


@router.get("/revenue")
def revenue_report(db: DbSession, user: CurrentUser, from_date: str | None = None, to_date: str | None = None):
    q = select(Payment)
    if from_date:
        q = q.where(Payment.payment_date >= date.fromisoformat(from_date))
    if to_date:
        q = q.where(Payment.payment_date <= date.fromisoformat(to_date))
    items = db.scalars(q.order_by(Payment.payment_date.desc())).all()
    total = sum(float(p.amount) for p in items)
    return {"items": items, "total": total}


@router.get("/bookings")
def bookings_report(db: DbSession, user: CurrentUser, from_date: str | None = None, to_date: str | None = None):
    q = select(RoomBooking).where(RoomBooking.deleted_at.is_(None))
    if from_date:
        q = q.where(RoomBooking.booking_date >= date.fromisoformat(from_date))
    if to_date:
        q = q.where(RoomBooking.booking_date <= date.fromisoformat(to_date))
    return {"items": db.scalars(q).all()}


@router.get("/audit")
def audit_report(db: DbSession, user: CurrentUser, module: str | None = None, limit: int = 100):
    q = select(AuditLog)
    if module:
        q = q.where(AuditLog.module == module)
    return {"items": db.scalars(q.order_by(AuditLog.created_at.desc()).limit(limit)).all()}


@router.get("/export/{report_type}")
def export_report(report_type: str, db: DbSession, user: CurrentUser):
    wb = Workbook()
    ws = wb.active
    ws.title = report_type
    if report_type == "customers":
        ws.append(["الكود", "الاسم", "الرقم القومي", "الهاتف", "الحالة"])
        for c in db.scalars(select(Customer).where(Customer.deleted_at.is_(None))).all():
            ws.append([c.customer_code, c.full_name, c.national_id, c.phone, c.status])
    elif report_type == "payments":
        ws.append(["العميل", "المبلغ", "التاريخ", "الطريقة", "الحالة"])
        for p in db.scalars(select(Payment)).all():
            ws.append([str(p.customer_id), float(p.amount), str(p.payment_date), p.payment_method, p.status])
    elif report_type == "hours":
        ws.append(["العميل", "المبلغ", "النوع", "السبب", "التاريخ"])
        for h in db.scalars(select(HoursTransaction)).all():
            ws.append([str(h.customer_id), float(h.amount), h.transaction_type, h.reason, str(h.created_at)])
    else:
        ws.append(["لا توجد بيانات"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={report_type}.xlsx"},
    )
