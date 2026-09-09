import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Payment, PaymentStatus
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


@router.get("")
def list_payments(db: DbSession, user: CurrentUser, customer_id: uuid.UUID | None = None, status: str | None = None):
    q = select(Payment)
    if customer_id:
        q = q.where(Payment.customer_id == customer_id)
    if status:
        q = q.where(Payment.status == status)
    items = db.scalars(q.order_by(Payment.payment_date.desc())).all()
    total = sum(float(p.amount) for p in items if p.status == PaymentStatus.PAID.value)
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
