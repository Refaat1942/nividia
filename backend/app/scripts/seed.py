from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select, text

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models.entities import (
    ContractTemplateVariable,
    Customer,
    Office,
    Package,
    Permission,
    Role,
    RolePermission,
    Room,
    Setting,
    User,
    UserRole,
)

settings = get_settings()

PERMISSIONS = [
    ("customers.view", "عرض العملاء", "customers"),
    ("customers.create", "إنشاء عميل", "customers"),
    ("customers.edit", "تعديل عميل", "customers"),
    ("customers.delete", "حذف عميل", "customers"),
    ("packages.view", "عرض الباقات", "packages"),
    ("packages.create", "إنشاء باقة", "packages"),
    ("packages.edit", "تعديل باقة", "packages"),
    ("packages.delete", "حذف باقة", "packages"),
    ("rooms.view", "عرض الغرف", "rooms"),
    ("rooms.manage", "إدارة الغرف", "rooms"),
    ("rooms.book", "حجز غرف", "rooms"),
    ("offices.view", "عرض المكاتب", "offices"),
    ("offices.manage", "إدارة المكاتب", "offices"),
    ("contracts.view", "عرض العقود", "contracts"),
    ("contracts.create", "إنشاء عقد", "contracts"),
    ("contracts.edit", "تعديل عقد", "contracts"),
    ("contracts.print", "طباعة عقد", "contracts"),
    ("documents.view", "عرض المستندات", "documents"),
    ("documents.upload", "رفع مستند", "documents"),
    ("documents.delete", "حذف مستند", "documents"),
    ("payments.view", "عرض المدفوعات", "payments"),
    ("payments.create", "تسجيل دفعة", "payments"),
    ("payments.edit", "تعديل دفعة", "payments"),
    ("reports.view", "عرض التقارير", "reports"),
    ("reports.export", "تصدير التقارير", "reports"),
    ("users.manage", "إدارة المستخدمين", "users"),
    ("settings.manage", "إدارة الإعدادات", "settings"),
    ("audit.view", "عرض سجل العمليات", "audit"),
    ("hours.manage", "إدارة الساعات", "hours"),
]

ROLES = {
    "super_admin": ("مدير النظام", True),
    "manager": ("مدير", False),
    "reception": ("استقبال", False),
    "accountant": ("محاسب", False),
    "sales": ("مبيعات", False),
    "viewer": ("مشاهد", False),
}

ROLE_PERMS = {
    "super_admin": [p[0] for p in PERMISSIONS],
    "manager": [p[0] for p in PERMISSIONS if p[0] != "users.manage"],
    "reception": ["customers.view", "customers.create", "customers.edit", "rooms.view", "rooms.book", "bookings.view", "documents.view", "documents.upload"],
    "accountant": ["customers.view", "payments.view", "payments.create", "payments.edit", "reports.view", "reports.export"],
    "sales": ["customers.view", "customers.create", "packages.view", "contracts.view", "contracts.create"],
    "viewer": [p[0] for p in PERMISSIONS if ".view" in p[0]],
}

TEMPLATE_VARS = [
    ("customer_name", "اسم العميل", "customer.full_name"),
    ("national_id", "الرقم القومي", "customer.national_id"),
    ("phone", "الهاتف", "customer.phone"),
    ("email", "البريد", "customer.email"),
    ("address", "العنوان", "customer.address"),
    ("company_name", "اسم الشركة", "customer.company_name"),
    ("tax_id", "الرقم الضريبي", "customer.tax_id"),
    ("package_name", "اسم الباقة", "package.name"),
    ("package_price", "سعر الباقة", "package.price"),
    ("included_hours", "الساعات المشمولة", "package.included_hours"),
    ("contract_start", "تاريخ البداية", "contract.start_date"),
    ("contract_end", "تاريخ النهاية", "contract.end_date"),
    ("office_name", "اسم المكتب", "office.name"),
    ("room_name", "اسم الغرفة", "room.name"),
    ("contract_number", "رقم العقد", "contract.contract_number"),
    ("bonus_hours", "ساعات البونص", "hours.bonus_hours"),
    ("remaining_hours", "الساعات المتبقية", "hours.remaining_hours"),
]

DEFAULT_SETTINGS = {
    "business_name": "فراتيلانزا",
    "currency": "EGP",
    "working_hours": "9:00-18:00",
}


def _ensure_user_schema() -> None:
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)"))
            conn.execute(text(
                "UPDATE users SET username = LOWER(SPLIT_PART(email, '@', 1)) "
                "WHERE (username IS NULL OR username = '') AND email IS NOT NULL AND email <> ''"
            ))
            conn.execute(text("UPDATE users SET username = 'admin' WHERE username IS NULL OR username = ''"))
            conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
    except Exception:
        pass


def run_seed() -> None:
    _ensure_user_schema()
    db = SessionLocal()
    try:
        for code, name_ar, module in PERMISSIONS:
            if not db.scalar(select(Permission).where(Permission.code == code)):
                db.add(Permission(code=code, name_ar=name_ar, module=module))

        role_map = {}
        for name, (name_ar, is_system) in ROLES.items():
            role = db.scalar(select(Role).where(Role.name == name))
            if not role:
                role = Role(name=name, name_ar=name_ar, is_system=is_system)
                db.add(role)
                db.flush()
            role_map[name] = role

        for role_name, perm_codes in ROLE_PERMS.items():
            role = role_map[role_name]
            for code in perm_codes:
                perm = db.scalar(select(Permission).where(Permission.code == code))
                if perm and not db.scalar(select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == perm.id)):
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))

        for key, label, source in TEMPLATE_VARS:
            if not db.scalar(select(ContractTemplateVariable).where(ContractTemplateVariable.key == key)):
                db.add(ContractTemplateVariable(key=key, label_ar=label, source_field=source))

        for key, value in DEFAULT_SETTINGS.items():
            if not db.scalar(select(Setting).where(Setting.key == key)):
                db.add(Setting(key=key, value=value))

        admin_username = settings.ADMIN_USERNAME.strip().lower()
        admin = db.scalar(select(User).where(func.lower(User.username) == admin_username))
        if not admin:
            password = settings.ADMIN_PASSWORD or "ChangeMeNow123!"
            admin = User(
                username=admin_username,
                email=settings.ADMIN_EMAIL or None,
                full_name=settings.ADMIN_NAME,
                hashed_password=hash_password(password),
                is_active=True,
                is_superuser=True,
                must_change_password=not settings.ADMIN_PASSWORD,
            )
            db.add(admin)
            db.flush()
            super_role = role_map["super_admin"]
            db.add(UserRole(user_id=admin.id, role_id=super_role.id))

        if settings.SEED_DEMO_DATA:
            _seed_demo(db)

        db.commit()
    finally:
        db.close()


def _seed_demo(db) -> None:
    if db.scalar(select(Customer).limit(1)):
        return
    pkg = Package(
        name="باقة تجريبية", package_type="monthly",
        monthly_price=Decimal("5000"), included_hours=Decimal("100"),
        bonus_hours=Decimal("10"), is_active=True, display_order=1,
        description="بيانات تجريبية - DEMO",
    )
    db.add(pkg)
    db.flush()
    customer = Customer(
        customer_code="C202600001",
        full_name="أحمد محمد علي",
        national_id="29001011234567",
        phone="01012345678",
        email="demo@example.com",
        company_name="شركة تجريبية",
        status="active",
    )
    db.add(customer)
    room = Room(room_number="R101", name="غرفة الاجتماعات أ", capacity=10, hourly_price=Decimal("200"), status="available")
    db.add(room)
    office = Office(office_number="O201", name="مكتب 201", floor="2", capacity=4, monthly_price=Decimal("8000"), status="available")
    db.add(office)
