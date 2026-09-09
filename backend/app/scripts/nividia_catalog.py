import os
import shutil
import uuid
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.models.entities import ContractTemplate, Package, Setting
from app.services.contracts import scan_and_store_template_fields

settings = get_settings()

NIVIDIA_SERVICES = """التكلفة تشمل: العقد وإيصال المرافق والأوراق القانونية لاستخراج أوراق شركتك.

الخدمات المقدمة:
• السكرتارية لاستقبال عملائك
• بوفيه لتقديم المشروبات لعملائك
• مكان مخصص لوجو شركتك في الريسبشن وقت الميتنج والمعاينات
• ميتنج روم ومكتب مدير لاستقبال عملائك وتصوير وطباعة مستنداتك
• تأسيس شركتك أو تغيير عنوان شركتك على المقر بعد التعاقد

الباقات السنوية تُدفع مرة واحدة.
عرض السنتين أو أكثر: خصم 10% عن كل سنة إضافية."""

NIVIDIA_SETTINGS = {
    "business_name": "نفيديا",
    "currency": "EGP",
    "working_hours": "9:00-18:00",
    "phone": "",
    "email": "",
    "address": "261 الحي 4 - المجاورة 2 - المحور المركزي - 6 أكتوبر - الجيزة",
    "maps_url": "https://maps.app.goo.gl/vgxv8zbWxViZMcs48",
    "facebook_url": "https://www.facebook.com/share/19o45L68MJ/",
    "services_description": NIVIDIA_SERVICES,
    "multi_year_discount_percent": "10",
    "package_payment_note": "الباقات السنوية تُدفع مرة واحدة",
}

# (sku, arabic name, annual price EGP, included hours, display order)
NIVIDIA_ANNUAL_PACKAGES = [
    ("nividia-10h", "باقة 10 ساعات سنوية", Decimal("2000"), Decimal("10"), 1),
    ("nividia-20h", "باقة 20 ساعة سنوية", Decimal("4000"), Decimal("20"), 2),
    ("nividia-40h", "باقة 40 ساعة سنوية", Decimal("6000"), Decimal("40"), 3),
    ("nividia-50h", "باقة 50 ساعة سنوية", Decimal("7000"), Decimal("50"), 4),
    ("nividia-60h", "باقة 60 ساعة سنوية", Decimal("8000"), Decimal("60"), 5),
    ("nividia-70h", "باقة 70 ساعة سنوية", Decimal("9000"), Decimal("70"), 6),
    ("nividia-80h", "باقة 80 ساعة سنوية", Decimal("10000"), Decimal("80"), 7),
    ("nividia-100h", "باقة 100 ساعة سنوية", Decimal("12000"), Decimal("100"), 8),
    ("nividia-200h", "باقة 200 ساعة سنوية", Decimal("22000"), Decimal("200"), 9),
]


def _upsert_setting(db, key: str, value: str) -> None:
    row = db.scalar(select(Setting).where(Setting.key == key))
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))


def seed_nividia_catalog(db) -> None:
    for key, value in NIVIDIA_SETTINGS.items():
        _upsert_setting(db, key, value)

    active_skus = set()
    for sku, name, annual_price, hours, order in NIVIDIA_ANNUAL_PACKAGES:
        active_skus.add(sku)
        pkg = db.scalar(select(Package).where(Package.name_en == sku, Package.deleted_at.is_(None)))
        if not pkg:
            pkg = Package(name_en=sku)
            db.add(pkg)
            db.flush()

        pkg.name = name
        pkg.package_type = "annual"
        pkg.annual_price = annual_price
        pkg.monthly_price = None
        pkg.hourly_price = None
        pkg.included_hours = hours
        pkg.bonus_hours = Decimal("0")
        pkg.validity_days = 365
        pkg.display_order = order
        pkg.is_active = True
        pkg.description = NIVIDIA_SERVICES
        pkg.terms = "دفعة سنوية واحدة. خصم 10% لكل سنة إضافية عند التعاقد لسنتين أو أكثر."
        pkg.allowed_services = {
            "secretariat": True,
            "buffet": True,
            "logo_display": True,
            "meeting_room": True,
            "manager_office": True,
            "printing": True,
            "company_registration": True,
            "address_change": True,
            "contract_included": True,
            "utilities_receipt": True,
            "legal_papers": True,
        }

    old_nividia = db.scalars(
        select(Package).where(
            Package.name_en.like("nividia-%"),
            Package.deleted_at.is_(None),
        )
    ).all()
    for pkg in old_nividia:
        if pkg.name_en not in active_skus:
            pkg.is_active = False


def seed_nividia_contract_template(db) -> None:
    """Register default Nividia contract template if DOCX exists in deploy/templates."""
    repo_root = Path(__file__).resolve().parents[2]
    templates_dir = repo_root / "deploy" / "templates"
    candidates = [
        templates_dir / "nividia-contract-2026.docx",
        templates_dir / "عقد نفيديا المحدث 2026.docx",
    ]
    source = next((p for p in candidates if p.is_file()), None)
    if not source:
        for p in templates_dir.glob("*.docx"):
            source = p
            break
    if not source:
        return

    sku = "nividia-contract-2026"
    existing = db.scalar(
        select(ContractTemplate).where(ContractTemplate.description == sku)
    )
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "templates"), exist_ok=True)
    dest = os.path.join(settings.UPLOAD_DIR, "templates", f"{uuid.uuid4()}_{source.name}")
    if not existing or not os.path.exists(existing.file_path):
        shutil.copy2(source, dest)
        if existing:
            existing.file_path = dest
            existing.name = "عقد نفيديا المحدث 2026"
            existing.is_active = True
            tpl = existing
        else:
            tpl = ContractTemplate(
                name="عقد نفيديا المحدث 2026",
                description=sku,
                file_path=dest,
                is_active=True,
            )
            db.add(tpl)
            db.flush()
        scan_and_store_template_fields(db, tpl)
