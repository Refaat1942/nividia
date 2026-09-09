import io
from datetime import date

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import AuditLog, Customer, CustomerSession, HoursTransaction, Payment, RoomBooking

router = APIRouter(prefix="/reports", tags=["التقارير"])


def _parse_dates(from_date: str | None, to_date: str | None):
    start = date.fromisoformat(from_date) if from_date else None
    end = date.fromisoformat(to_date) if to_date else None
    return start, end


@router.get("/customers")
def customers_report(db: DbSession, user: CurrentUser, status: str | None = None):
    q = select(Customer).where(Customer.deleted_at.is_(None))
    if status:
        q = q.where(Customer.status == status)
    return {"items": db.scalars(q).all()}


@router.get("/hours-usage")
def hours_report(
    db: DbSession,
    user: CurrentUser,
    customer_id: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
):
    start, end = _parse_dates(from_date, to_date)
    q = select(HoursTransaction)
    if customer_id:
        q = q.where(HoursTransaction.customer_id == customer_id)
    if start:
        q = q.where(func.date(HoursTransaction.created_at) >= start)
    if end:
        q = q.where(func.date(HoursTransaction.created_at) <= end)
    return {"items": db.scalars(q.order_by(HoursTransaction.created_at.desc())).all()}


@router.get("/revenue")
def revenue_report(db: DbSession, user: CurrentUser, from_date: str | None = None, to_date: str | None = None):
    start, end = _parse_dates(from_date, to_date)
    q = select(Payment)
    if start:
        q = q.where(Payment.payment_date >= start)
    if end:
        q = q.where(Payment.payment_date <= end)
    items = db.scalars(q.order_by(Payment.payment_date.desc())).all()
    total = sum(float(p.amount) for p in items)
    return {"items": items, "total": total}


@router.get("/bookings")
def bookings_report(db: DbSession, user: CurrentUser, from_date: str | None = None, to_date: str | None = None):
    start, end = _parse_dates(from_date, to_date)
    q = select(RoomBooking).where(RoomBooking.deleted_at.is_(None))
    if start:
        q = q.where(RoomBooking.booking_date >= start)
    if end:
        q = q.where(RoomBooking.booking_date <= end)
    return {"items": db.scalars(q).all()}


@router.get("/sessions")
def sessions_report(db: DbSession, user: CurrentUser, from_date: str | None = None, to_date: str | None = None):
    start, end = _parse_dates(from_date, to_date)
    q = select(CustomerSession, Customer).join(Customer, CustomerSession.customer_id == Customer.id)
    if start:
        q = q.where(func.date(CustomerSession.check_in_at) >= start)
    if end:
        q = q.where(func.date(CustomerSession.check_in_at) <= end)
    rows = db.execute(q.order_by(CustomerSession.check_in_at.desc())).all()
    return {
        "items": [
            {
                "customer_name": c.full_name,
                "check_in_at": s.check_in_at.isoformat() if s.check_in_at else None,
                "check_out_at": s.check_out_at.isoformat() if s.check_out_at else None,
                "duration_minutes": s.duration_minutes,
                "hours_deducted": float(s.hours_deducted or 0),
                "status": s.status,
            }
            for s, c in rows
        ]
    }


@router.get("/audit")
def audit_report(
    db: DbSession,
    user: CurrentUser,
    module: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = 500,
):
    start, end = _parse_dates(from_date, to_date)
    q = select(AuditLog)
    if module:
        q = q.where(AuditLog.module == module)
    if start:
        q = q.where(func.date(AuditLog.created_at) >= start)
    if end:
        q = q.where(func.date(AuditLog.created_at) <= end)
    return {"items": db.scalars(q.order_by(AuditLog.created_at.desc()).limit(limit)).all()}


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    db: DbSession,
    user: CurrentUser,
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
):
    start, end = _parse_dates(from_date, to_date)
    wb = Workbook()
    ws = wb.active
    ws.title = report_type

    if report_type == "customers":
        ws.append(["الكود", "الاسم", "الرقم القومي", "الهاتف", "الحالة", "تاريخ التسجيل"])
        for c in db.scalars(select(Customer).where(Customer.deleted_at.is_(None)).order_by(Customer.full_name)).all():
            ws.append([c.customer_code, c.full_name, c.national_id, c.phone, c.status, str(c.created_at or "")])

    elif report_type == "payments":
        ws.append(["العميل", "المبلغ", "التاريخ", "الطريقة", "الحالة"])
        q = select(Payment)
        if start:
            q = q.where(Payment.payment_date >= start)
        if end:
            q = q.where(Payment.payment_date <= end)
        for p in db.scalars(q.order_by(Payment.payment_date)).all():
            cust = db.get(Customer, p.customer_id)
            ws.append([cust.full_name if cust else str(p.customer_id), float(p.amount), str(p.payment_date), p.payment_method, p.status])

    elif report_type == "hours":
        ws.append(["العميل", "المبلغ (ساعات)", "النوع", "السبب", "التاريخ"])
        q = select(HoursTransaction)
        if start:
            q = q.where(func.date(HoursTransaction.created_at) >= start)
        if end:
            q = q.where(func.date(HoursTransaction.created_at) <= end)
        for h in db.scalars(q.order_by(HoursTransaction.created_at)).all():
            cust = db.get(Customer, h.customer_id)
            ws.append([cust.full_name if cust else str(h.customer_id), float(h.amount), h.transaction_type, h.reason or "", str(h.created_at)])

    elif report_type == "bookings":
        ws.append(["العميل", "الغرفة", "التاريخ", "من", "إلى", "الساعات", "الحالة"])
        q = select(RoomBooking).where(RoomBooking.deleted_at.is_(None))
        if start:
            q = q.where(RoomBooking.booking_date >= start)
        if end:
            q = q.where(RoomBooking.booking_date <= end)
        for b in db.scalars(q.order_by(RoomBooking.booking_date)).all():
            cust = db.get(Customer, b.customer_id)
            ws.append([
                cust.full_name if cust else str(b.customer_id),
                str(b.room_id),
                str(b.booking_date),
                str(b.start_time),
                str(b.end_time),
                float(b.hours),
                b.booking_status,
            ])

    elif report_type == "sessions":
        ws.append(["العميل", "الحضور", "الانصراف", "المدة (دقيقة)", "الخصم (ساعة)", "الحالة"])
        q = select(CustomerSession, Customer).join(Customer, CustomerSession.customer_id == Customer.id)
        if start:
            q = q.where(func.date(CustomerSession.check_in_at) >= start)
        if end:
            q = q.where(func.date(CustomerSession.check_in_at) <= end)
        for s, c in db.execute(q.order_by(CustomerSession.check_in_at)).all():
            ws.append([
                c.full_name,
                str(s.check_in_at or ""),
                str(s.check_out_at or ""),
                s.duration_minutes or "",
                float(s.hours_deducted or 0),
                s.status,
            ])

    elif report_type == "audit":
        ws.append(["الوحدة", "الإجراء", "المستخدم", "التاريخ"])
        q = select(AuditLog)
        if start:
            q = q.where(func.date(AuditLog.created_at) >= start)
        if end:
            q = q.where(func.date(AuditLog.created_at) <= end)
        for a in db.scalars(q.order_by(AuditLog.created_at.desc()).limit(2000)).all():
            ws.append([a.module, a.action, str(a.user_id or ""), str(a.created_at)])

    else:
        ws.append(["نوع التقرير غير معروف"])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    suffix = ""
    if from_date or to_date:
        suffix = f"_{from_date or 'start'}_{to_date or 'end'}"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.officedocumentml.sheet",
        headers={"Content-Disposition": f"attachment; filename={report_type}{suffix}.xlsx"},
    )
