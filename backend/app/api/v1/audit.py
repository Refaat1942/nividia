from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.core.deps import CurrentUser, DbSession
from app.models.entities import AuditLog

router = APIRouter(prefix="/audit", tags=["سجل العمليات"])


@router.get("")
def list_audit_logs(
    db: DbSession, user: CurrentUser,
    module: str | None = None, action: str | None = None,
    search: str | None = None, limit: int = Query(100, le=500),
):
    q = select(AuditLog)
    if module:
        q = q.where(AuditLog.module == module)
    if action:
        q = q.where(AuditLog.action == action)
    if search:
        q = q.where(or_(AuditLog.record_id.ilike(f"%{search}%"), AuditLog.module.ilike(f"%{search}%")))
    items = db.scalars(q.order_by(AuditLog.created_at.desc()).limit(limit)).all()
    return {"items": items}
