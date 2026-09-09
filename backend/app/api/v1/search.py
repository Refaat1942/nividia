from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import Contract, Customer, Office, Room, RoomBooking

router = APIRouter(prefix="/search", tags=["البحث"])


@router.get("")
def global_search(db: DbSession, user: CurrentUser, q: str = Query(min_length=1)):
    term = f"%{q}%"
    customers = db.scalars(
        select(Customer).where(
            Customer.deleted_at.is_(None),
            or_(Customer.full_name.ilike(term), Customer.phone.ilike(term),
                Customer.national_id.ilike(term), Customer.company_name.ilike(term)),
        ).limit(10)
    ).all()
    contracts = db.scalars(
        select(Contract).where(Contract.contract_number.ilike(term), Contract.deleted_at.is_(None)).limit(5)
    ).all()
    offices = db.scalars(select(Office).where(Office.name.ilike(term), Office.deleted_at.is_(None)).limit(5)).all()
    rooms = db.scalars(select(Room).where(Room.name.ilike(term), Room.deleted_at.is_(None)).limit(5)).all()
    return {
        "customers": [{"id": str(c.id), "name": c.full_name, "phone": c.phone} for c in customers],
        "contracts": [{"id": str(c.id), "number": c.contract_number} for c in contracts],
        "offices": [{"id": str(o.id), "name": o.name} for o in offices],
        "rooms": [{"id": str(r.id), "name": r.name} for r in rooms],
    }
