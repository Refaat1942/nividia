import re
import zipfile
from typing import Iterable

# Maps template placeholder names (any casing/spacing) to canonical context keys.
FIELD_ALIASES: dict[str, str] = {
    "customer_name": "customer_name",
    "اسم_العميل": "customer_name",
    "اسم العميل": "customer_name",
    "full_name": "customer_name",
    "national_id": "national_id",
    "الرقم_القومي": "national_id",
    "الرقم القومي": "national_id",
    "phone": "phone",
    "الهاتف": "phone",
    "email": "email",
    "البريد": "email",
    "address": "address",
    "العنوان": "address",
    "company_name": "company_name",
    "اسم_الشركة": "company_name",
    "اسم الشركة": "company_name",
    "tax_id": "tax_id",
    "الرقم_الضريبي": "tax_id",
    "package_name": "package_name",
    "اسم_الباقة": "package_name",
    "package_price": "package_price",
    "سعر_الباقة": "package_price",
    "included_hours": "included_hours",
    "الساعات_المشمولة": "included_hours",
    "contract_start": "contract_start",
    "تاريخ_البداية": "contract_start",
    "contract_end": "contract_end",
    "تاريخ_النهاية": "contract_end",
    "office_name": "office_name",
    "اسم_المكتب": "office_name",
    "room_name": "room_name",
    "اسم_الغرفة": "room_name",
    "contract_number": "contract_number",
    "رقم_العقد": "contract_number",
    "bonus_hours": "bonus_hours",
    "ساعات_البونص": "bonus_hours",
    "remaining_hours": "remaining_hours",
    "الساعات_المتبقية": "remaining_hours",
    "today_date": "today_date",
    "تاريخ_اليوم": "today_date",
    "business_name": "business_name",
    "اسم_الشركة_المزودة": "business_name",
    "company_address": "company_address",
    "عنوان_الشركة": "company_address",
    "maps_url": "maps_url",
    "facebook_url": "facebook_url",
    "customer_code": "customer_code",
    "كود_العميل": "customer_code",
    "used_hours": "used_hours",
    "total_available": "total_available",
    "اسم_الطرف_الثاني": "customer_name",
    "اسم الطرف الثاني": "customer_name",
    "رقم_الهوية": "national_id",
    "رقم الهوية": "national_id",
    "التليفون": "phone",
    "تليفون": "phone",
    "موبايل": "phone",
    "البريد_الالكتروني": "email",
    "قيمة_العقد": "package_price",
    "قيمة العقد": "package_price",
    "سعر_العقد": "package_price",
    "عدد_الساعات": "included_hours",
    "عدد الساعات": "included_hours",
    "الساعات": "included_hours",
    "تاريخ_التعاقد": "contract_start",
    "تاريخ التعاقد": "contract_start",
    "تاريخ_الانتهاء": "contract_end",
    "تاريخ الانتهاء": "contract_end",
    "عنوان_المقر": "company_address",
    "عنوان المقر": "company_address",
    "اسم_نفيديا": "business_name",
}

FIELD_LABELS_AR: dict[str, str] = {
    "customer_name": "اسم العميل",
    "national_id": "الرقم القومي",
    "phone": "الهاتف",
    "email": "البريد الإلكتروني",
    "address": "العنوان",
    "company_name": "اسم الشركة",
    "tax_id": "الرقم الضريبي",
    "customer_code": "كود العميل",
    "package_name": "اسم الباقة",
    "package_price": "سعر الباقة",
    "included_hours": "الساعات المشمولة",
    "contract_start": "تاريخ البداية",
    "contract_end": "تاريخ النهاية",
    "office_name": "اسم المكتب",
    "room_name": "اسم الغرفة",
    "contract_number": "رقم العقد",
    "bonus_hours": "ساعات البونص",
    "remaining_hours": "الساعات المتبقية",
    "used_hours": "الساعات المستخدمة",
    "total_available": "إجمالي الساعات",
    "today_date": "تاريخ اليوم",
    "business_name": "اسم الشركة (نفيديا)",
    "company_address": "عنوان الشركة",
    "maps_url": "رابط الخريطة",
    "facebook_url": "رابط فيسبوك",
}

JINJA_VAR_RE = re.compile(r"\{\{\s*([^}%#][^}]*?)\s*\}\}")
MERGEFIELD_RE = re.compile(r"MERGEFIELD\s+([^\s\\*]+)", re.IGNORECASE)


def _normalize_key(raw: str) -> str:
    return raw.strip().replace(" ", "_")


def canonicalize_field(raw: str) -> str | None:
    key = _normalize_key(raw)
    if key in FIELD_ALIASES:
        return FIELD_ALIASES[key]
    lower = key.lower()
    if lower in FIELD_ALIASES:
        return FIELD_ALIASES[lower]
    for alias, canonical in FIELD_ALIASES.items():
        if alias.lower() == lower:
            return canonical
    return None


def _xml_to_plain(xml: str) -> str:
    text = re.sub(r"<w:tab[^/]*/>", "\t", xml)
    text = re.sub(r"<w:br[^/]*/>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text


def _collect_jinja_vars(text: str, found: set[str]) -> None:
    for match in JINJA_VAR_RE.finditer(text):
        raw = match.group(1).strip()
        if raw and not raw.startswith(("{", "%")):
            found.add(raw)


def extract_docx_variables(docx_path: str) -> list[str]:
    found: set[str] = set()
    try:
        with zipfile.ZipFile(docx_path, "r") as zf:
            xml_parts = [n for n in zf.namelist() if n.endswith(".xml")]
            merged_plain = ""
            for part in xml_parts:
                try:
                    text = zf.read(part).decode("utf-8", errors="ignore")
                except Exception:
                    continue
                _collect_jinja_vars(text, found)
                merged_plain += _xml_to_plain(text)
                for match in MERGEFIELD_RE.finditer(text):
                    found.add(match.group(1).strip())
            _collect_jinja_vars(merged_plain, found)
    except Exception:
        return []
    return sorted(found)


def analyze_template_fields(docx_path: str) -> list[dict]:
    raw_fields = extract_docx_variables(docx_path)
    result = []
    for raw in raw_fields:
        canonical = canonicalize_field(raw)
        result.append({
            "raw": raw,
            "canonical": canonical,
            "label_ar": FIELD_LABELS_AR.get(canonical or "", raw),
            "auto_mapped": canonical is not None,
        })
    return result


def validate_fields(fields: Iterable[dict], available_keys: set[str]) -> dict:
    unmapped = [f["raw"] for f in fields if not f.get("canonical")]
    missing_in_context = [
        f["canonical"] for f in fields
        if f.get("canonical") and f["canonical"] not in available_keys
    ]
    return {
        "unmapped": unmapped,
        "missing_in_context": missing_in_context,
        "ready": len(unmapped) == 0 and len(missing_in_context) == 0,
    }
