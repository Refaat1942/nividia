import os
import uuid

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Document
from app.services.audit import log_audit

router = APIRouter(prefix="/documents", tags=["المستندات"])
settings = get_settings()


@router.get("")
def list_documents(db: DbSession, user: CurrentUser, customer_id: uuid.UUID | None = None, document_type: str | None = None):
    q = select(Document).where(Document.deleted_at.is_(None))
    if customer_id:
        q = q.where(Document.customer_id == customer_id)
    if document_type:
        q = q.where(Document.document_type == document_type)
    return {"items": db.scalars(q.order_by(Document.created_at.desc())).all()}


@router.post("", status_code=201)
async def upload_document(
    request: Request, db: DbSession, user: CurrentUser,
    customer_id: uuid.UUID, name: str, document_type: str,
    notes: str | None = None, expiration_date: str | None = None,
    file: UploadFile = File(...),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(400, "نوع الملف غير مسموح")
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, "حجم الملف كبير جدًا")
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "documents", str(customer_id)), exist_ok=True)
    path = os.path.join(settings.UPLOAD_DIR, "documents", str(customer_id), f"{uuid.uuid4()}{ext}")
    with open(path, "wb") as f:
        f.write(content)
    from datetime import date
    doc = Document(
        customer_id=customer_id, name=name, document_type=document_type,
        file_path=path, file_size=len(content), mime_type=file.content_type,
        notes=notes, expiration_date=date.fromisoformat(expiration_date) if expiration_date else None,
        uploaded_by=user.id,
    )
    db.add(doc)
    log_audit(db, user_id=user.id, action="upload", module="documents", record_id=str(doc.id),
              ip_address=get_client_ip(request))
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{document_id}/download")
def download_document(document_id: uuid.UUID, db: DbSession, user: CurrentUser):
    doc = db.get(Document, document_id)
    if not doc or doc.deleted_at or not os.path.exists(doc.file_path):
        raise HTTPException(404, "المستند غير موجود")
    return FileResponse(doc.file_path, filename=doc.name)


@router.delete("/{document_id}")
def delete_document(document_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(404)
    from datetime import datetime, timezone
    doc.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id=user.id, action="delete", module="documents", record_id=str(document_id),
              ip_address=get_client_ip(request))
    db.commit()
    return {"message": "تم الحذف"}
