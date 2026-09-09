import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import AuditLog


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (uuid.UUID, datetime, date)):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    return value


def log_audit(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    action: str,
    module: str,
    record_id: str | None = None,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        module=module,
        record_id=record_id,
        old_value=_json_safe(old_value),
        new_value=_json_safe(new_value),
        ip_address=ip_address,
    )
    db.add(entry)
    return entry
