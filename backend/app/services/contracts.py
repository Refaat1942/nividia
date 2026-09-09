import os
import uuid
from datetime import date
from decimal import Decimal

from docxtpl import DocxTemplate
from sqlalchemy.orm import Session

from app.models.entities import Contract, ContractTemplate, Customer, Office, Package, Room
from app.services.hours import get_hours_summary


def build_contract_context(
    db: Session,
    customer: Customer,
    package: Package | None = None,
    office: Office | None = None,
    room: Room | None = None,
    contract: Contract | None = None,
) -> dict:
    hours = get_hours_summary(db, customer.id)
    ctx = {
        "customer_name": customer.full_name,
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
    }
    return ctx


def generate_contract_docx(
    template_path: str,
    output_path: str,
    context: dict,
) -> str:
    doc = DocxTemplate(template_path)
    doc.render(context)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path
