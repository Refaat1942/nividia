import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Office, OfficeAssignment
from app.services.audit import log_audit

router = APIRouter(prefix="/offices", tags=["المكاتب"])


class OfficeSchema(BaseModel):
    office_number: str
    name: str
    floor: str | None = None
    capacity: int | None = None
    size_sqm: Decimal | None = None
    description: str | None = None
    monthly_price: Decimal | None = None
    annual_price: Decimal | None = None
    amenities: dict | None = None
    status: str = "available"

    class Config:
        from_attributes = True


class OfficeAssignmentSchema(BaseModel):
    office_id: uuid.UUID
    customer_id: uuid.UUID
    subscription_id: uuid.UUID | None = None
    start_date: str
    end_date: str | None = None
    rental_type: str


@router.get("")
def list_offices(db: DbSession, user: CurrentUser, status: str | None = None):
    q = select(Office).where(Office.deleted_at.is_(None))
    if status:
        q = q.where(Office.status == status)
    return {"items": db.scalars(q.order_by(Office.office_number)).all()}


@router.post("", status_code=201)
def create_office(data: OfficeSchema, request: Request, db: DbSession, user: CurrentUser):
    office = Office(**data.model_dump())
    db.add(office)
    db.commit()
    db.refresh(office)
    return office


@router.delete("/{office_id}")
def delete_office(office_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    from datetime import datetime, timezone

    office = db.get(Office, office_id)
    if not office or office.deleted_at:
        raise HTTPException(404, "المكتب غير موجود")
    office.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id=user.id, action="delete", module="offices", record_id=str(office_id),
              ip_address=get_client_ip(request))
    db.commit()
    return {"message": "تم الحذف"}


@router.patch("/{office_id}")
def update_office(office_id: uuid.UUID, data: OfficeSchema, db: DbSession, user: CurrentUser):
    office = db.get(Office, office_id)
    if not office or office.deleted_at:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(office, k, v)
    db.commit()
    db.refresh(office)
    return office


@router.post("/assignments", status_code=201)
def assign_office(data: OfficeAssignmentSchema, request: Request, db: DbSession, user: CurrentUser):
    from datetime import date
    office = db.get(Office, data.office_id)
    if not office:
        raise HTTPException(404, "المكتب غير موجود")
    assignment = OfficeAssignment(
        office_id=data.office_id,
        customer_id=data.customer_id,
        subscription_id=data.subscription_id,
        start_date=date.fromisoformat(data.start_date),
        end_date=date.fromisoformat(data.end_date) if data.end_date else None,
        rental_type=data.rental_type,
        status="active",
    )
    office.status = "occupied"
    db.add(assignment)
    log_audit(db, user_id=user.id, action="assign", module="offices", record_id=str(data.office_id),
              ip_address=get_client_ip(request))
    db.commit()
    return {"message": "تم تعيين المكتب", "id": str(assignment.id)}
