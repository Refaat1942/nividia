from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PackageBase(BaseModel):
    name: str = Field(min_length=1)
    name_en: Optional[str] = None
    package_type: str
    monthly_price: Optional[Decimal] = None
    annual_price: Optional[Decimal] = None
    hourly_price: Optional[Decimal] = None
    included_hours: Decimal = Decimal("0")
    room_hours: Optional[Decimal] = None
    office_hours: Optional[Decimal] = None
    extra_hour_price: Optional[Decimal] = None
    bonus_hours: Decimal = Decimal("0")
    validity_days: Optional[int] = None
    max_users: Optional[int] = None
    description: Optional[str] = None
    terms: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class PackageCreate(PackageBase):
    pass


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    package_type: Optional[str] = None
    monthly_price: Optional[Decimal] = None
    annual_price: Optional[Decimal] = None
    hourly_price: Optional[Decimal] = None
    included_hours: Optional[Decimal] = None
    room_hours: Optional[Decimal] = None
    office_hours: Optional[Decimal] = None
    extra_hour_price: Optional[Decimal] = None
    bonus_hours: Optional[Decimal] = None
    validity_days: Optional[int] = None
    max_users: Optional[int] = None
    description: Optional[str] = None
    terms: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class PackageResponse(PackageBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    customer_id: UUID
    package_id: UUID
    subscription_type: str
    start_date: str
    end_date: Optional[str] = None
    price: Optional[Decimal] = None
    notes: Optional[str] = None
