import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Customer, Payment, PaymentStatus
from app.services.audit import log_audit

router = APIRouter(prefix="/payments", tags=["المدفوعات"])


class PaymentCreate(BaseModel):
    customer_id: uuid.UUID
    contract_id: uuid.UUID | None = None
    amount: Decimal
    payment_date: str
    payment_method: str
    reference: str | None = None
    status: str = "paid"
    notes: str | None = None


class PaymentUpdate(BaseModel):
    amount: Decimal | None = None
    payment_date: str | None = None
    payment_method: str | None = None
    reference: str | None = None
    status: str | None = None
    notes: str | None = None


def _payment_dict(p: Payment, customer: Customer | None = None) -> dict:
    return {
        "id": str(p.id),
        "customer_id": str(p.customer_id),
        "customer_name": customer.full_name if customer else None,
        "contract_id": str(p.contract_id) if p.contract_id else None,
        "amount": float(p.amount),
        "payment_date": str(p.payment_date),
        "payment_method": p.payment_method,
        "reference": p.reference,
        "status": p.status,
        "notes": p.notes,
    }


@router.get("")
def list_payments(db: DbSession, user: CurrentUser, customer_id: uuid.UUID | None = None, status: str | None = None):
    q = select(Payment, Customer).join(Customer, Payment.customer_id == Customer.id)
    if customer_id:
        q = q.where(Payment.customer_id == customer_id)
    if status:
        q = q.where(Payment.status == status)
    rows = db.execute(q.order_by(Payment.payment_date.desc())).all()
    items = [_payment_dict(p, c) for p, c in rows]
    total = sum(i["amount"] for i in items if i["status"] == PaymentStatus.PAID.value)
    return {"items": items, "total_amount": total}


@router.post("", status_code=201)
def create_payment(data: PaymentCreate, request: Request, db: DbSession, user: CurrentUser):
    payment = Payment(
        customer_id=data.customer_id,
        contract_id=data.contract_id,
        amount=data.amount,
        payment_date=date.fromisoformat(data.payment_date),
        payment_method=data.payment_method,
        reference=data.reference,
        status=data.status,
        notes=data.notes,
        created_by=user.id,
    )
    db.add(payment)
    log_audit(db, user_id=user.id, action="create", module="payments", record_id=str(payment.id),
              new_value=data.model_dump(), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{payment_id}")
def update_payment(payment_id: uuid.UUID, data: PaymentUpdate, request: Request, db: DbSession, user: CurrentUser):
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "الدفعة غير موجودة")
    updates = data.model_dump(exclude_unset=True)
    if "payment_date" in updates and updates["payment_date"]:
        updates["payment_date"] = date.fromisoformat(updates["payment_date"])
    for k, v in updates.items():
        setattr(payment, k, v)
    log_audit(db, user_id=user.id, action="update", module="payments", record_id=str(payment_id),
              new_value={k: str(v) for k, v in updates.items()}, ip_address=get_client_ip(request))
    db.commit()
    db.refresh(payment)
    return payment
