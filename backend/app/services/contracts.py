import os
import uuid
from datetime import date
from decimal import Decimal

from docxtpl import DocxTemplate
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Contract, ContractTemplate, Customer, Office, Package, Room, Setting
from app.services.docx_arabic_fill import fill_arabic_blanks
from app.services.docx_fields import FIELD_LABELS_AR, analyze_template_fields, canonicalize_field
from app.services.hours import get_hours_summary


def _get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.scalar(select(Setting).where(Setting.key == key))
    return row.value if row and row.value else default


def build_contract_context(
    db: Session,
    customer: Customer,
    package: Package | None = None,
    office: Office | None = None,
    room: Room | None = None,
    contract: Contract | None = None,
    extra: dict | None = None,
) -> dict:
    hours = get_hours_summary(db, customer.id)
    ctx = {
        "customer_name": customer.full_name,
        "customer_code": customer.customer_code,
        "national_id": customer.national_id,
        "phone": customer.phone,
        "email": customer.email or "",
        "address": customer.address or "",
        "company_name": customer.company_name or "",
        "tax_id": customer.tax_id or "",
        "package_name": package.name if package else "",
        "package_price": str(package.monthly_price or package.annual_price or "") if package else "",
        "included_hours": str(package.included_hours) if package else str(hours["package_hours"]),
        "contract_start": str(contract.start_date) if contract and contract.start_date else str(date.today()),
        "contract_end": str(contract.end_date) if contract and contract.end_date else "",
        "office_name": office.name if office else "",
        "room_name": room.name if room else "",
        "contract_number": contract.contract_number if contract else "",
        "bonus_hours": str(hours["bonus_hours"]),
        "remaining_hours": str(hours["remaining_hours"]),
        "used_hours": str(hours["used_hours"]),
        "total_available": str(hours["total_available"]),
        "today_date": str(date.today()),
        "business_name": _get_setting(db, "business_name", "نفيديا"),
        "company_address": _get_setting(db, "address", ""),
        "maps_url": _get_setting(db, "maps_url", ""),
        "facebook_url": _get_setting(db, "facebook_url", ""),
    }
    if extra:
        ctx.update(extra)
    return ctx


def build_render_context(db: Session, template: ContractTemplate, base_context: dict) -> dict:
    """Map template raw placeholders to values using detected fields metadata."""
    render_ctx = dict(base_context)
    fields = (template.variables_json or {}).get("fields", [])
    if not fields:
        return render_ctx

    for field in fields:
        raw = field.get("raw")
        canonical = field.get("canonical") or canonicalize_field(raw or "")
        if raw and canonical and canonical in base_context:
            render_ctx[raw] = base_context[canonical]
        elif raw and raw in base_context:
            render_ctx[raw] = base_context[raw]
    return render_ctx


def generate_contract_docx(
    template_path: str,
    output_path: str,
    context: dict,
) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    tmp_path = output_path + ".tmp.docx"
    try:
        doc = DocxTemplate(template_path)
        doc.render(context)
        doc.save(tmp_path)
    except Exception:
        import shutil
        shutil.copy2(template_path, tmp_path)
    fill_arabic_blanks(tmp_path, output_path, context)
    if os.path.exists(tmp_path) and tmp_path != output_path:
        os.remove(tmp_path)
    return output_path


def scan_and_store_template_fields(db: Session, template: ContractTemplate) -> list[dict]:
    fields = analyze_template_fields(template.file_path)
    template.variables_json = {
        "fields": fields,
        "detected_at": str(date.today()),
        "field_count": len(fields),
        "auto_mapped_count": sum(1 for f in fields if f["auto_mapped"]),
    }
    db.flush()
    return fields


def get_available_context_keys() -> list[dict]:
    return [
        {"key": k, "label_ar": FIELD_LABELS_AR.get(k, k)}
        for k in sorted(FIELD_LABELS_AR.keys())
    ]


def render_contract_for_customer(
    db: Session,
    template: ContractTemplate,
    customer: Customer,
    package: Package | None = None,
    office: Office | None = None,
    room: Room | None = None,
    contract: Contract | None = None,
    extra: dict | None = None,
) -> tuple[dict, dict]:
    base = build_contract_context(db, customer, package, office, room, contract, extra)
    render_ctx = build_render_context(db, template, base)
    return base, render_ctx
