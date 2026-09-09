import uuid
from datetime import date, time

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.entities import RoomBooking


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
