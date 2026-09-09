from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampMixin(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
