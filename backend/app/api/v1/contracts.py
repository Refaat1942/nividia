import os
import uuid
from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.models.entities import Contract, ContractTemplate, Customer, Office, Package, Room
from app.services.audit import log_audit
from app.services.contracts import (
    build_contract_context,
    generate_contract_docx,
    get_available_context_keys,
    render_contract_for_customer,
    scan_and_store_template_fields,
)
from app.services.docx_fields import FIELD_LABELS_AR

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
    extra_fields: dict[str, str] | None = None


class ContractUpdate(BaseModel):
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    package_id: uuid.UUID | None = None
    office_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


def _next_contract_number(db) -> str:
    count = db.scalar(select(func.count()).select_from(Contract)) or 0
    return f"CTR-{date.today().year}-{str(count + 1).zfill(5)}"


def _template_dict(tpl: ContractTemplate) -> dict:
    return {
        "id": str(tpl.id),
        "name": tpl.name,
        "description": tpl.description,
        "version": tpl.version,
        "is_active": tpl.is_active,
        "variables_json": tpl.variables_json,
        "created_at": tpl.created_at.isoformat() if tpl.created_at else None,
    }


def _contract_dict(c: Contract, customer: Customer | None = None, db: Session | None = None) -> dict:
    template_name = None
    fields: list[dict] = []
    if db:
        if c.template_id:
            tpl = db.get(ContractTemplate, c.template_id)
            template_name = tpl.name if tpl else None
        fields = _contract_field_rows(db, c)
    return {
        "id": str(c.id),
        "contract_number": c.contract_number,
        "customer_id": str(c.customer_id),
        "customer_name": customer.full_name if customer else None,
        "template_id": str(c.template_id) if c.template_id else None,
        "template_name": template_name,
        "package_id": str(c.package_id) if c.package_id else None,
        "office_id": str(c.office_id) if c.office_id else None,
        "room_id": str(c.room_id) if c.room_id else None,
        "start_date": str(c.start_date) if c.start_date else None,
        "end_date": str(c.end_date) if c.end_date else None,
        "status": c.status,
        "metadata_json": c.metadata_json,
        "fields": fields,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _contract_field_rows(db, contract: Contract) -> list[dict]:
    meta = contract.metadata_json or {}
    template = db.get(ContractTemplate, contract.template_id) if contract.template_id else None
    render = meta.get("render") or {}
    base = meta.get("base") or {}

    if template and (template.variables_json or {}).get("fields"):
        rows = []
        for f in template.variables_json["fields"]:
            raw = f.get("raw")
            canonical = f.get("canonical")
            value = render.get(raw) or (base.get(canonical or "") if canonical else "")
            rows.append({
                "field": raw,
                "label_ar": f.get("label_ar") or FIELD_LABELS_AR.get(canonical or "", raw),
                "value": value,
                "auto_mapped": f.get("auto_mapped", False),
            })
        if rows:
            return rows

    if base:
        return [
            {"field": k, "label_ar": FIELD_LABELS_AR.get(k, k), "value": v, "auto_mapped": True}
            for k, v in base.items()
        ]

    customer = db.get(Customer, contract.customer_id)
    if not customer:
        return []
    package = db.get(Package, contract.package_id) if contract.package_id else None
    office = db.get(Office, contract.office_id) if contract.office_id else None
    room = db.get(Room, contract.room_id) if contract.room_id else None
    if template:
        base_ctx, render_ctx = render_contract_for_customer(db, template, customer, package, office, room, contract)
        return [
            {"field": k, "label_ar": FIELD_LABELS_AR.get(k, k), "value": v, "auto_mapped": True}
            for k, v in (base_ctx or {}).items()
        ]
    ctx = build_contract_context(db, customer, package, office, room, contract)
    return [
        {"field": k, "label_ar": FIELD_LABELS_AR.get(k, k), "value": v, "auto_mapped": True}
        for k, v in ctx.items()
    ]


@router.get("/templates")
def list_templates(db: DbSession, user: CurrentUser):
    items = db.scalars(
        select(ContractTemplate).where(ContractTemplate.is_active.is_(True)).order_by(ContractTemplate.name)
    ).all()
    return {"items": [_template_dict(t) for t in items]}


@router.get("/templates/{template_id}")
def get_template(template_id: uuid.UUID, db: DbSession, user: CurrentUser):
    tpl = db.get(ContractTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "القالب غير موجود")
    return _template_dict(tpl)


@router.get("/variables")
def list_variables(db: DbSession, user: CurrentUser):
    return {"items": get_available_context_keys()}


@router.post("/templates", status_code=201)
async def upload_template(
    request: Request, db: DbSession, user: CurrentUser,
    name: str = Form(...), description: str | None = Form(None),
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
    db.flush()
    fields = scan_and_store_template_fields(db, tpl)
    log_audit(db, user_id=user.id, action="upload", module="contract_templates", record_id=str(tpl.id),
              new_value={"name": name, "fields_detected": len(fields)}, ip_address=get_client_ip(request))
    db.commit()
    db.refresh(tpl)
    result = _template_dict(tpl)
    result["detected_fields"] = fields
    return result


@router.delete("/templates/{template_id}")
def delete_template(template_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    tpl = db.get(ContractTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "القالب غير موجود")
    if tpl.file_path and os.path.exists(tpl.file_path):
        os.remove(tpl.file_path)
    tpl.is_active = False
    log_audit(db, user_id=user.id, action="delete", module="contract_templates", record_id=str(template_id),
              ip_address=get_client_ip(request))
    db.commit()
    return {"message": "تم حذف القالب"}


@router.patch("/templates/{template_id}")
def update_template(template_id: uuid.UUID, data: TemplateUpdate, request: Request, db: DbSession, user: CurrentUser):
    tpl = db.get(ContractTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "القالب غير موجود")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(tpl, k, v)
    log_audit(db, user_id=user.id, action="update", module="contract_templates", record_id=str(template_id),
              new_value=updates, ip_address=get_client_ip(request))
    db.commit()
    return _template_dict(tpl)


@router.post("/templates/{template_id}/rescan")
def rescan_template(template_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    tpl = db.get(ContractTemplate, template_id)
    if not tpl or not os.path.exists(tpl.file_path):
        raise HTTPException(404, "القالب غير موجود")
    fields = scan_and_store_template_fields(db, tpl)
    db.commit()
    return {"fields": fields, "variables_json": tpl.variables_json}


@router.get("/preview-context")
def preview_context(
    db: DbSession, user: CurrentUser,
    customer_id: uuid.UUID,
    template_id: uuid.UUID | None = None,
    package_id: uuid.UUID | None = None,
    office_id: uuid.UUID | None = None,
    room_id: uuid.UUID | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "العميل غير موجود")
    package = db.get(Package, package_id) if package_id else None
    office = db.get(Office, office_id) if office_id else None
    room = db.get(Room, room_id) if room_id else None
    contract_stub = Contract(
        contract_number="PREVIEW",
        customer_id=customer_id,
        start_date=date.fromisoformat(start_date) if start_date else None,
        end_date=date.fromisoformat(end_date) if end_date else None,
    )
    template = db.get(ContractTemplate, template_id) if template_id else None
    if template:
        base, render = render_contract_for_customer(db, template, customer, package, office, room, contract_stub)
        fields = (template.variables_json or {}).get("fields", [])
        preview = []
        for f in fields:
            raw = f.get("raw")
            canonical = f.get("canonical")
            preview.append({
                "field": raw,
                "label_ar": f.get("label_ar") or FIELD_LABELS_AR.get(canonical or "", raw),
                "value": render.get(raw) or (base.get(canonical or "") if canonical else ""),
                "auto_mapped": f.get("auto_mapped", False),
            })
        if not preview:
            preview = [
                {"field": k, "label_ar": FIELD_LABELS_AR.get(k, k), "value": v, "auto_mapped": True}
                for k, v in base.items()
            ]
        return {"context": base, "render_context": render, "fields": preview}
    base = build_contract_context(db, customer, package, office, room, contract_stub)
    return {
        "context": base,
        "fields": [{"field": k, "label_ar": FIELD_LABELS_AR.get(k, k), "value": v, "auto_mapped": True} for k, v in base.items()],
    }


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
    base, render_ctx = render_contract_for_customer(
        db, template, customer, package, office, room, contract, data.extra_fields
    )
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "contracts"), exist_ok=True)
    out_path = os.path.join(settings.UPLOAD_DIR, "contracts", f"{contract.contract_number}.docx")
    generate_contract_docx(template.file_path, out_path, render_ctx)
    contract.generated_file_path = out_path
    contract.metadata_json = {"base": base, "render": render_ctx}
    log_audit(db, user_id=user.id, action="generate", module="contracts", record_id=str(contract.id),
              new_value={"contract_number": contract.contract_number}, ip_address=get_client_ip(request))
    db.commit()
    db.refresh(contract)
    return _contract_dict(contract, customer, db)


@router.get("")
def list_contracts(db: DbSession, user: CurrentUser, customer_id: uuid.UUID | None = None):
    q = select(Contract, Customer).join(Customer, Contract.customer_id == Customer.id).where(Contract.deleted_at.is_(None))
    if customer_id:
        q = q.where(Contract.customer_id == customer_id)
    rows = db.execute(q.order_by(Contract.created_at.desc())).all()
    return {"items": [_contract_dict(c, cust, db) for c, cust in rows]}


@router.get("/{contract_id}")
def get_contract(contract_id: uuid.UUID, db: DbSession, user: CurrentUser):
    contract = db.get(Contract, contract_id)
    if not contract or contract.deleted_at:
        raise HTTPException(404, "العقد غير موجود")
    customer = db.get(Customer, contract.customer_id)
    return _contract_dict(contract, customer, db)


@router.patch("/{contract_id}")
def update_contract(contract_id: uuid.UUID, data: ContractUpdate, request: Request, db: DbSession, user: CurrentUser):
    contract = db.get(Contract, contract_id)
    if not contract or contract.deleted_at:
        raise HTTPException(404, "العقد غير موجود")
    updates = data.model_dump(exclude_unset=True)
    if "start_date" in updates and updates["start_date"]:
        updates["start_date"] = date.fromisoformat(updates["start_date"])
    if "end_date" in updates and updates["end_date"]:
        updates["end_date"] = date.fromisoformat(updates["end_date"])
    for k, v in updates.items():
        setattr(contract, k, v)
    log_audit(db, user_id=user.id, action="update", module="contracts", record_id=str(contract_id),
              new_value={k: str(v) for k, v in updates.items()}, ip_address=get_client_ip(request))
    db.commit()
    customer = db.get(Customer, contract.customer_id)
    return _contract_dict(contract, customer, db)


@router.post("/{contract_id}/regenerate")
def regenerate_contract(contract_id: uuid.UUID, request: Request, db: DbSession, user: CurrentUser):
    contract = db.get(Contract, contract_id)
    if not contract or contract.deleted_at:
        raise HTTPException(404, "العقد غير موجود")
    template = db.get(ContractTemplate, contract.template_id) if contract.template_id else None
    if not template:
        raise HTTPException(400, "لا يوجد قالب مرتبط")
    customer = db.get(Customer, contract.customer_id)
    package = db.get(Package, contract.package_id) if contract.package_id else None
    office = db.get(Office, contract.office_id) if contract.office_id else None
    room = db.get(Room, contract.room_id) if contract.room_id else None
    base, render_ctx = render_contract_for_customer(db, template, customer, package, office, room, contract)
    out_path = contract.generated_file_path or os.path.join(
        settings.UPLOAD_DIR, "contracts", f"{contract.contract_number}.docx"
    )
    generate_contract_docx(template.file_path, out_path, render_ctx)
    contract.generated_file_path = out_path
    contract.metadata_json = {"base": base, "render": render_ctx}
    log_audit(db, user_id=user.id, action="regenerate", module="contracts", record_id=str(contract_id),
              ip_address=get_client_ip(request))
    db.commit()
    return _contract_dict(contract, customer, db)


@router.get("/{contract_id}/download")
def download_contract(contract_id: uuid.UUID, db: DbSession, user: CurrentUser):
    contract = db.get(Contract, contract_id)
    if not contract or not contract.generated_file_path or not os.path.exists(contract.generated_file_path):
        raise HTTPException(404, "العقد غير موجود")
    return FileResponse(
        contract.generated_file_path,
        filename=f"{contract.contract_number}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.get("/{contract_id}/print", response_class=HTMLResponse)
def print_contract(contract_id: uuid.UUID, db: DbSession, user: CurrentUser):
    contract = db.get(Contract, contract_id)
    if not contract or contract.deleted_at:
        raise HTTPException(404, "العقد غير موجود")
    customer = db.get(Customer, contract.customer_id)
    field_rows = _contract_field_rows(db, contract)

    rows = ""
    for f in field_rows:
        label = f.get("label_ar") or f.get("field")
        value = f.get("value") or ""
        rows += f"<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;width:35%'>{label}</td><td style='padding:8px;border:1px solid #ddd'>{value}</td></tr>"

    html = f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>عقد {contract.contract_number}</title>
  <style>
    body {{ font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }}
    h1 {{ text-align: center; margin-bottom: 8px; }}
    .sub {{ text-align: center; color: #64748b; margin-bottom: 32px; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
    .actions {{ text-align: center; margin: 24px; }}
    button {{ background: #1e40af; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }}
    @media print {{ .actions {{ display: none; }} }}
  </style>
</head>
<body>
  <h1>عقد رقم {contract.contract_number}</h1>
  <p class="sub">العميل: {customer.full_name if customer else '—'}</p>
  <table>{rows}</table>
  <div class="actions">
    <button onclick="window.print()">طباعة</button>
  </div>
</body>
</html>"""
    return HTMLResponse(html)
