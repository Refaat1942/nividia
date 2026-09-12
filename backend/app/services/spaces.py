from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.entities import Office, Room


def _is_bookable_office(space_type: str | None) -> bool:
    return bool(space_type) and space_type != "admin_office"


def sync_bookable_offices_to_rooms(db: Session) -> list[str]:
    """Create/update Room records for bookable offices (manager, custom, etc.)."""
    offices = db.scalars(select(Office).where(Office.deleted_at.is_(None))).all()
    created: list[str] = []

    for office in offices:
        amenities = office.amenities or {}
        space_type = amenities.get("space_type") or "admin_office"
        if not _is_bookable_office(space_type):
            continue

        room = db.scalar(
            select(Room).where(
                Room.deleted_at.is_(None),
                or_(Room.room_number == office.office_number, Room.name == office.name),
            )
        )
        equipment = {
            "space_type": space_type,
            "space_type_label": amenities.get("space_type_label"),
            "synced_from_office_id": str(office.id),
        }

        if room:
            current = room.equipment or {}
            if current.get("space_type") != space_type or not current.get("synced_from_office_id"):
                room.equipment = {**current, **equipment}
            if not room.capacity and office.capacity:
                room.capacity = office.capacity
            continue

        room = Room(
            room_number=office.office_number,
            name=office.name,
            capacity=office.capacity,
            status="available" if office.status in ("available", "reserved") else office.status,
            equipment=equipment,
        )
        db.add(room)
        created.append(office.name)

    if created:
        db.flush()
    return created
