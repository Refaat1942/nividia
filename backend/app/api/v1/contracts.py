import os
import uuid
from datetime import date

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Contract, ContractTemplate, ContractTemplateVariable, Customer, Office, Package, Room
from app.services.audit import log_audit
from app.services.contracts import build_contract_context, generate_contract_docx

router = APIRouter(prefix="/contracts", tags=["العقود"])
settings = get_settings()


class ContractGenerateRequest(BaseModel):
    customer_id: uuid.UUID
    template_id: uuid.UUID
    package_id: uuid.UUID | None = None
    office_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    start_date: str | None = None
    end_date: str | None = None


def _next_contract_number(db) -> str:
    count = db.scalar(select(func.count()).select_from(Contract)) or 0
    return f"CTR-{date.today().year}-{str(count + 1).zfill(5)}"


@router.get("/templates")
def list_templates(db: DbSession, user: CurrentUser):
    items = db.scalars(select(ContractTemplate).where(ContractTemplate.is_active.is_(True)).order_by(ContractTemplate.name)).all()
    return {"items": items}


@router.get("/variables")
def list_variables(db: DbSession, user: CurrentUser):
    items = db.scalars(select(ContractTemplateVariable).where(ContractTemplateVariable.is_active.is_(True))).all()
    return {"items": items}


@router.post("/templates", status_code=201)
async def upload_template(
    request: Request, db: DbSession, user: CurrentUser,
    name: str, description: str | None = None,
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "يجب رفع ملف DOCX")
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "templates"), exist_ok=True)
    path = os.path.join(settings.UPLOAD_DIR, "templates", f"{uuid.uuid4()}_{file.filename}")
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    tpl = ContractTemplate(name=name, description=description, file_path=path, created_by=user.id)
    db.add(tpl)
    log_audit(db, user_id=user.id, action="upload", module="contract_templates", record_id=str(tpl.id),
              ip_address=get_client_ip(request))
    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/generate", status_code=201)
def generate_contract(data: ContractGenerateRequest, request: Request, db: DbSession, user: CurrentUser):
    customer = db.get(Customer, data.customer_id)
    if not customer:
        raise HTTPException(404, "العميل غير موجود")
    template = db.get(ContractTemplate, data.template_id)
    if not template:
        raise HTTPException(404, "القالب غير موجود")
    package = db.get(Package, data.package_id) if data.package_id else None
    office = db.get(Office, data.office_id) if data.office_id else None
    room = db.get(Room, data.room_id) if data.room_id else None
    contract = Contract(
        contract_number=_next_contract_number(db),
        customer_id=data.customer_id,
        template_id=data.template_id,
        package_id=data.package_id,
        office_id=data.office_id,
        room_id=data.room_id,
        start_date=date.fromisoformat(data.start_date) if data.start_date else None,
        end_date=date.fromisoformat(data.end_date) if data.end_date else None,
        status="active",
        template_version=template.version,
        created_by=user.id,
    )
    db.add(contract)
    db.flush()
    ctx = build_contract_context(db, customer, package, office, room, contract)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "contracts"), exist_ok=True)
    out_path = os.path.join(settings.UPLOAD_DIR, "contracts", f"{contract.contract_number}.docx")
    generate_contract_docx(template.file_path, out_path, ctx)
    contract.generated_file_path = out_path
    contract.metadata_json = ctx
    log_audit(db, user_id=user.id, action="generate", module="contracts", record_id=str(contract.id),
              new_value={"contract_number": contract.contract_number}, ip_address=get_client_ip(request))
    db.commit()
    db.refresh(contract)
    return contract


@router.get("")
def list_contracts(db: DbSession, user: CurrentUser, customer_id: uuid.UUID | None = None):
    q = select(Contract).where(Contract.deleted_at.is_(None))
    if customer_id:
        q = q.where(Contract.customer_id == customer_id)
    return {"items": db.scalars(q.order_by(Contract.created_at.desc())).all()}


@router.get("/{contract_id}/download")
def download_contract(contract_id: uuid.UUID, db: DbSession, user: CurrentUser):
    contract = db.get(Contract, contract_id)
    if not contract or not contract.generated_file_path or not os.path.exists(contract.generated_file_path):
        raise HTTPException(404, "العقد غير موجود")
    return FileResponse(contract.generated_file_path, filename=f"{contract.contract_number}.docx")
