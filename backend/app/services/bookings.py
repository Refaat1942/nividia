import uuid
from datetime import date, time, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.entities import Customer, Room, RoomBooking


def _time_to_str(t: time) -> str:
    return t.strftime("%H:%M")


def _parse_time(value: str) -> time:
    parts = value.strip().split(":")
    if len(parts) == 2:
        return time(int(parts[0]), int(parts[1]))
    return time.fromisoformat(value)


def parse_working_hours(value: str | None) -> tuple[time, time]:
    raw = (value or "9:00-18:00").strip()
    start_s, end_s = raw.split("-", 1)
    return _parse_time(start_s), _parse_time(end_s)


def has_booking_conflict(
    db: Session,
    room_id: uuid.UUID,
    booking_date: date,
    start_time: time,
    end_time: time,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    if start_time >= end_time:
        return True

    conditions = [
        RoomBooking.room_id == room_id,
        RoomBooking.booking_date == booking_date,
        RoomBooking.booking_status.notin_(["cancelled"]),
        RoomBooking.deleted_at.is_(None),
        or_(
            and_(RoomBooking.start_time < end_time, RoomBooking.end_time > start_time),
        ),
    ]
    if exclude_id:
        conditions.append(RoomBooking.id != exclude_id)

    existing = db.scalar(select(RoomBooking.id).where(and_(*conditions)).limit(1))
    return existing is not None


def _compute_free_slots(
    day_start: time,
    day_end: time,
    bookings: list[tuple[time, time]],
) -> list[dict]:
    if day_start >= day_end:
        return []

    sorted_bookings = sorted(bookings, key=lambda b: b[0])
    free: list[dict] = []
    cursor = day_start

    for start, end in sorted_bookings:
        if start > cursor:
            free.append({"start_time": _time_to_str(cursor), "end_time": _time_to_str(start)})
        if end > cursor:
            cursor = end

    if cursor < day_end:
        free.append({"start_time": _time_to_str(cursor), "end_time": _time_to_str(day_end)})

    return free


def get_day_availability(
    db: Session,
    booking_date: date,
    *,
    room_id: uuid.UUID | None = None,
    work_start: time | None = None,
    work_end: time | None = None,
) -> dict:
    day_start = work_start or time(9, 0)
    day_end = work_end or time(18, 0)

    rooms_q = select(Room).where(Room.deleted_at.is_(None), Room.status != "disabled")
    if room_id:
        rooms_q = rooms_q.where(Room.id == room_id)
    rooms = db.scalars(rooms_q.order_by(Room.room_number)).all()

    result_rooms = []
    for room in rooms:
        rows = db.execute(
            select(RoomBooking, Customer.full_name)
            .join(Customer, RoomBooking.customer_id == Customer.id)
            .where(
                RoomBooking.room_id == room.id,
                RoomBooking.booking_date == booking_date,
                RoomBooking.booking_status.notin_(["cancelled"]),
                RoomBooking.deleted_at.is_(None),
            )
            .order_by(RoomBooking.start_time)
        ).all()

        booking_items = []
        booking_ranges: list[tuple[time, time]] = []
        for booking, customer_name in rows:
            booking_items.append({
                "id": str(booking.id),
                "customer_id": str(booking.customer_id),
                "customer_name": customer_name,
                "start_time": _time_to_str(booking.start_time),
                "end_time": _time_to_str(booking.end_time),
                "hours": float(booking.hours),
                "booking_status": booking.booking_status,
                "notes": booking.notes,
            })
            booking_ranges.append((booking.start_time, booking.end_time))

        free_slots = _compute_free_slots(day_start, day_end, booking_ranges)
        equipment = room.equipment or {}
        result_rooms.append({
            "room_id": str(room.id),
            "room_name": room.name,
            "room_number": room.room_number,
            "capacity": room.capacity,
            "hourly_price": float(room.hourly_price) if room.hourly_price else None,
            "status": room.status,
            "space_type": equipment.get("space_type", "meeting_room"),
            "space_type_label": equipment.get("space_type_label"),
            "bookings": booking_items,
            "free_slots": free_slots,
            "is_fully_booked": len(free_slots) == 0 and len(booking_items) > 0,
        })

    return {
        "date": str(booking_date),
        "working_hours": {"start": _time_to_str(day_start), "end": _time_to_str(day_end)},
        "rooms": result_rooms,
    }
