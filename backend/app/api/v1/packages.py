import math
import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import CustomerSubscription, HoursTransactionType, Package, SubscriptionStatus
from app.schemas.packages import PackageCreate, PackageResponse, PackageUpdate, SubscriptionCreate
from app.services.audit import log_audit
from app.services.hours import add_hours_transaction

router = APIRouter(prefix="/packages", tags=["الباقات"])


@router.get("")
def list_packages(db: DbSession, user: CurrentUser, page: int = 1, page_size: int = 50, active_only: bool = False):
    q = select(Package).where(Package.deleted_at.is_(None))
    if active_only:
        q = q.where(Package.is_active.is_(True))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items = db.scalars(q.order_by(Package.display_order, Package.name).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [PackageResponse.model_validate(i) for i in items], "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=PackageResponse, status_code=201)
def create_package(data: PackageCreate, request: Request, db: DbSession, user: CurrentUser):
    pkg = Package(**data.model_dump())
    db.add(pkg)
    db.flush()
    log_audit(db, user_id=user.id, action="create", module="packages", record_id=str(pkg.id),
              new_value=data.model_dump(), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(pkg)
    return pkg


@router.get("/{package_id}", response_model=PackageResponse)
def get_package(package_id: uuid.UUID, db: DbSession, user: CurrentUser):
    pkg = db.get(Package, package_id)
    if not pkg or pkg.deleted_at:
        raise HTTPException(404, "الباقة غير موجودة")
    return pkg


@router.patch("/{package_id}", response_model=PackageResponse)
def update_package(package_id: uuid.UUID, data: PackageUpdate, request: Request, db: DbSession, user: CurrentUser):
    pkg = db.get(Package, package_id)
    if not pkg or pkg.deleted_at:
        raise HTTPException(404, "الباقة غير موجودة")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(pkg, k, v)
    log_audit(db, user_id=user.id, action="update", module="packages", record_id=str(package_id),
              new_value=updates, ip_address=get_client_ip(request))
    db.commit()
    db.refresh(pkg)
    return pkg


@router.post("/{package_id}/duplicate", response_model=PackageResponse, status_code=201)
def duplicate_package(package_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    pkg = db.get(Package, package_id)
    if not pkg or pkg.deleted_at:
        raise HTTPException(404, "الباقة غير موجودة")
    new_pkg = Package(
        name=f"{pkg.name} (نسخة)",
        name_en=pkg.name_en,
        package_type=pkg.package_type,
        monthly_price=pkg.monthly_price,
        annual_price=pkg.annual_price,
        hourly_price=pkg.hourly_price,
        included_hours=pkg.included_hours,
        room_hours=pkg.room_hours,
        office_hours=pkg.office_hours,
        extra_hour_price=pkg.extra_hour_price,
        bonus_hours=pkg.bonus_hours,
        validity_days=pkg.validity_days,
        max_users=pkg.max_users,
        description=pkg.description,
        terms=pkg.terms,
        display_order=pkg.display_order + 1,
        is_active=False,
    )
    db.add(new_pkg)
    db.commit()
    db.refresh(new_pkg)
    return new_pkg


@router.delete("/{package_id}")
def delete_package(package_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    pkg = db.get(Package, package_id)
    if not pkg or pkg.deleted_at:
        raise HTTPException(404, "الباقة غير موجودة")
    from datetime import datetime, timezone
    pkg.deleted_at = datetime.now(timezone.utc)
    pkg.is_active = False
    db.commit()
    return {"message": "تم تعطيل الباقة"}


@router.post("/subscriptions", status_code=201)
def assign_subscription(data: SubscriptionCreate, request: Request, db: DbSession, user: CurrentUser):
    pkg = db.get(Package, data.package_id)
    if not pkg or pkg.deleted_at:
        raise HTTPException(404, "الباقة غير موجودة")
    sub = CustomerSubscription(
        customer_id=data.customer_id,
        package_id=data.package_id,
        subscription_type=data.subscription_type,
        start_date=date.fromisoformat(data.start_date),
        end_date=date.fromisoformat(data.end_date) if data.end_date else None,
        price=data.price,
        notes=data.notes,
        status=SubscriptionStatus.ACTIVE.value,
        created_by=user.id,
    )
    db.add(sub)
    db.flush()
    if pkg.included_hours and pkg.included_hours > 0:
        add_hours_transaction(
            db, customer_id=data.customer_id, amount=Decimal(str(pkg.included_hours)),
            transaction_type=HoursTransactionType.PACKAGE.value,
            reason=f"باقة: {pkg.name}", reference_type="subscription", reference_id=sub.id,
            created_by=user.id,
        )
    if pkg.bonus_hours and pkg.bonus_hours > 0:
        add_hours_transaction(
            db, customer_id=data.customer_id, amount=Decimal(str(pkg.bonus_hours)),
            transaction_type=HoursTransactionType.BONUS.value,
            reason=f"ساعات بونص - باقة: {pkg.name}", reference_type="subscription", reference_id=sub.id,
            created_by=user.id,
        )
    log_audit(db, user_id=user.id, action="assign_package", module="subscriptions",
              record_id=str(sub.id), new_value=data.model_dump(), ip_address=get_client_ip(request))
    db.commit()
    return {"message": "تم تعيين الباقة", "subscription_id": str(sub.id)}
