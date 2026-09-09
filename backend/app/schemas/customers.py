from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.validators import normalize_national_id, normalize_phone, validate_egyptian_phone, validate_national_id


class CustomerBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    national_id: str = Field(min_length=14, max_length=14)
    phone: str = Field(min_length=11, max_length=11)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    tax_id: Optional[str] = None
    customer_type: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        v = normalize_phone(v)
        ok, err = validate_egyptian_phone(v)
        if not ok:
            raise ValueError(err)
        return v

    @field_validator("national_id")
    @classmethod
    def check_national_id(cls, v: str) -> str:
        v = normalize_national_id(v)
        ok, err = validate_national_id(v)
        if not ok:
            raise ValueError(err)
        return v


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    tax_id: Optional[str] = None
    customer_type: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if v == "":
            return None
        return v

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = normalize_phone(v)
        ok, err = validate_egyptian_phone(v)
        if not ok:
            raise ValueError(err)
        return v


class CustomerResponse(CustomerBase):
    id: UUID
    customer_code: str
    registration_date: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerProfileResponse(CustomerResponse):
    hours_summary: dict = {}
    active_subscription: Optional[dict] = None
    contracts_count: int = 0
    documents_count: int = 0
    bookings_count: int = 0
    payments_count: int = 0


class HoursAdjustmentRequest(BaseModel):
    amount: float
    transaction_type: str = "bonus"
    reason: str = Field(min_length=1)
