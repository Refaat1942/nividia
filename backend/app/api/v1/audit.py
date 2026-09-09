import uuid

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import or_, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import AuditLog
from app.services.admin_access import ensure_super_admin
from app.services.audit import log_audit

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


@router.delete("/{log_id}")
def delete_audit_log(log_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    ensure_super_admin(db, user)
    if not user.is_superuser:
        raise HTTPException(403, "فقط مدير النظام يمكنه حذف سجل العمليات")
    entry = db.get(AuditLog, log_id)
    if not entry:
        raise HTTPException(404, "السجل غير موجود")
    db.delete(entry)
    log_audit(
        db,
        user_id=user.id,
        action="delete",
        module="audit",
        record_id=str(log_id),
        ip_address=get_client_ip(request),
    )
    db.commit()
    return {"message": "تم حذف السجل"}
