import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import AuditLog


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
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(entry)
    return entry
