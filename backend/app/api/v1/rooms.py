import math
import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Room
from app.services.audit import log_audit

router = APIRouter(prefix="/rooms", tags=["غرف الاجتماعات"])


class RoomSchema(BaseModel):
    room_number: str
    name: str
    capacity: int | None = None
    description: str | None = None
    equipment: dict | None = None
    hourly_price: Decimal | None = None
    location: str | None = None
    status: str = "available"

    class Config:
        from_attributes = True


class RoomResponse(RoomSchema):
    id: uuid.UUID


@router.get("")
def list_rooms(db: DbSession, user: CurrentUser, page: int = 1, page_size: int = 50, status: str | None = None):
    q = select(Room).where(Room.deleted_at.is_(None))
    if status:
        q = q.where(Room.status == status)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items = db.scalars(q.order_by(Room.room_number).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": items, "total": total}


@router.post("", status_code=201)
def create_room(data: RoomSchema, request: Request, db: DbSession, user: CurrentUser):
    room = Room(**data.model_dump())
    db.add(room)
    db.flush()
    log_audit(db, user_id=user.id, action="create", module="rooms", record_id=str(room.id),
              new_value=data.model_dump(), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(room)
    return room


@router.patch("/{room_id}")
def update_room(room_id: uuid.UUID, data: RoomSchema, request: Request, db: DbSession, user: CurrentUser):
    room = db.get(Room, room_id)
    if not room or room.deleted_at:
        raise HTTPException(404, "الغرفة غير موجودة")
    for k, v in data.model_dump().items():
        setattr(room, k, v)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}")
def delete_room(room_id: uuid.UUID, db: DbSession, user: CurrentUser):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404)
    from datetime import datetime, timezone
    room.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "تم الحذف"}
