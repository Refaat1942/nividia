import uuid
from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import BookingStatus, Customer, HoursTransactionType, Room, RoomBooking, Setting
from app.services.audit import log_audit
from app.services.bookings import get_day_availability, has_booking_conflict, parse_working_hours
from app.services.hours import add_hours_transaction, get_customer_balance

router = APIRouter(prefix="/bookings", tags=["الحجوزات"])


class BookingCreate(BaseModel):
    customer_id: uuid.UUID
    room_id: uuid.UUID
    booking_date: str
    start_time: str
    end_time: str
    hours: float
    price: float | None = None
    deduct_hours: bool = True
    notes: str | None = None


class BookingUpdate(BaseModel):
    booking_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    hours: float | None = None
    price: float | None = None
    booking_status: str | None = None
    payment_status: str | None = None
    notes: str | None = None


@router.get("")
def list_bookings(
    db: DbSession, user: CurrentUser,
    booking_date: str | None = None,
    room_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
):
    q = (
        select(RoomBooking, Room.name, Room.room_number, Customer.full_name)
        .join(Room, RoomBooking.room_id == Room.id)
        .join(Customer, RoomBooking.customer_id == Customer.id)
        .where(RoomBooking.deleted_at.is_(None))
    )
    if booking_date:
        q = q.where(RoomBooking.booking_date == date.fromisoformat(booking_date))
    if room_id:
        q = q.where(RoomBooking.room_id == room_id)
    if customer_id:
        q = q.where(RoomBooking.customer_id == customer_id)
    rows = db.execute(q.order_by(RoomBooking.booking_date.desc(), RoomBooking.start_time)).all()
    items = []
    for booking, room_name, room_number, customer_name in rows:
        items.append({
            "id": str(booking.id),
            "customer_id": str(booking.customer_id),
            "customer_name": customer_name,
            "room_id": str(booking.room_id),
            "room_name": room_name,
            "room_number": room_number,
            "booking_date": str(booking.booking_date),
            "start_time": booking.start_time.strftime("%H:%M") if hasattr(booking.start_time, "strftime") else str(booking.start_time),
            "end_time": booking.end_time.strftime("%H:%M") if hasattr(booking.end_time, "strftime") else str(booking.end_time),
            "hours": float(booking.hours),
            "price": float(booking.price) if booking.price else None,
            "booking_status": booking.booking_status,
            "payment_status": booking.payment_status,
            "notes": booking.notes,
        })
    return {"items": items}


@router.get("/availability")
def booking_availability(
    db: DbSession,
    user: CurrentUser,
    booking_date: str,
    room_id: uuid.UUID | None = None,
):
    wh = db.scalar(select(Setting).where(Setting.key == "working_hours"))
    work_start, work_end = parse_working_hours(wh.value if wh else None)
    return get_day_availability(
        db,
        date.fromisoformat(booking_date),
        room_id=room_id,
        work_start=work_start,
        work_end=work_end,
    )


@router.get("/check-slot")
def check_booking_slot(
    db: DbSession,
    user: CurrentUser,
    room_id: uuid.UUID,
    booking_date: str,
    start_time: str,
    end_time: str,
    exclude_id: uuid.UUID | None = None,
):
    conflict = has_booking_conflict(
        db,
        room_id,
        date.fromisoformat(booking_date),
        time.fromisoformat(start_time),
        time.fromisoformat(end_time),
        exclude_id=exclude_id,
    )
    return {"available": not conflict}


@router.post("", status_code=201)
def create_booking(data: BookingCreate, request: Request, db: DbSession, user: CurrentUser):
    bdate = date.fromisoformat(data.booking_date)
    st = time.fromisoformat(data.start_time)
    et = time.fromisoformat(data.end_time)
    if has_booking_conflict(db, data.room_id, bdate, st, et):
        raise HTTPException(400, "يوجد حجز متعارض في هذا الوقت")
    room = db.get(Room, data.room_id)
    if not room or room.status == "disabled":
        raise HTTPException(400, "الغرفة غير متاحة")
    hours = Decimal(str(data.hours))
    price = Decimal(str(data.price)) if data.price else (room.hourly_price or Decimal("0")) * hours
    booking = RoomBooking(
        customer_id=data.customer_id,
        room_id=data.room_id,
        booking_date=bdate,
        start_time=st,
        end_time=et,
        hours=hours,
        price=price,
        hours_deducted=hours if data.deduct_hours else None,
        booking_status=BookingStatus.CONFIRMED.value,
        notes=data.notes,
        created_by=user.id,
    )
    db.add(booking)
    db.flush()
    if data.deduct_hours:
        try:
            add_hours_transaction(
                db, customer_id=data.customer_id, amount=-hours,
                transaction_type=HoursTransactionType.USAGE.value,
                reason=f"حجز غرفة: {room.name}", reference_type="booking", reference_id=booking.id,
                created_by=user.id, allow_negative=user.is_superuser,
            )
        except ValueError as e:
            db.rollback()
            raise HTTPException(400, str(e))
    log_audit(db, user_id=user.id, action="create", module="bookings", record_id=str(booking.id),
              new_value=data.model_dump(), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/{booking_id}")
def update_booking(booking_id: uuid.UUID, data: BookingUpdate, request: Request, db: DbSession, user: CurrentUser):
    booking = db.get(RoomBooking, booking_id)
    if not booking or booking.deleted_at:
        raise HTTPException(404, "الحجز غير موجود")
    updates = data.model_dump(exclude_unset=True)
    if "booking_date" in updates and updates["booking_date"]:
        updates["booking_date"] = date.fromisoformat(updates["booking_date"])
    if "start_time" in updates and updates["start_time"]:
        updates["start_time"] = time.fromisoformat(updates["start_time"])
    if "end_time" in updates and updates["end_time"]:
        updates["end_time"] = time.fromisoformat(updates["end_time"])
    if "hours" in updates and updates["hours"] is not None:
        updates["hours"] = Decimal(str(updates["hours"]))
    if "price" in updates and updates["price"] is not None:
        updates["price"] = Decimal(str(updates["price"]))
    for k, v in updates.items():
        setattr(booking, k, v)
    log_audit(db, user_id=user.id, action="update", module="bookings", record_id=str(booking_id),
              new_value={k: str(v) for k, v in updates.items()}, ip_address=get_client_ip(request))
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/{booking_id}")
def cancel_booking(booking_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    booking = db.get(RoomBooking, booking_id)
    if not booking or booking.deleted_at:
        raise HTTPException(404)
    booking.booking_status = BookingStatus.CANCELLED.value
    from datetime import timezone
    booking.deleted_at = datetime.now(timezone.utc)
    if booking.hours_deducted:
        add_hours_transaction(
            db, customer_id=booking.customer_id, amount=booking.hours_deducted,
            transaction_type=HoursTransactionType.REFUND.value,
            reason="إلغاء حجز", reference_type="booking", reference_id=booking.id,
            created_by=user.id,
        )
    log_audit(db, user_id=user.id, action="cancel", module="bookings", record_id=str(booking_id),
              ip_address=get_client_ip(request))
    db.commit()
    return {"message": "تم إلغاء الحجز"}
