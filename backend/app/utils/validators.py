import re

EGYPTIAN_PHONE_PREFIXES = ("010", "011", "012", "015")
PHONE_PATTERN = re.compile(r"^(010|011|012|015)\d{8}$")
NATIONAL_ID_PATTERN = re.compile(r"^\d{14}$")


def validate_egyptian_phone(phone: str) -> tuple[bool, str | None]:
    if not phone:
        return False, "رقم الهاتف مطلوب"
    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if not cleaned.isdigit():
        return False, "رقم الهاتف يجب أن يحتوي على أرقام فقط"
    if len(cleaned) != 11:
        return False, "رقم الهاتف يجب أن يكون 11 رقمًا"
    if not cleaned.startswith(EGYPTIAN_PHONE_PREFIXES):
        return False, "رقم الهاتف يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015"
    if not PHONE_PATTERN.match(cleaned):
        return False, "رقم الهاتف غير صالح"
    return True, None


def validate_national_id(national_id: str) -> tuple[bool, str | None]:
    if not national_id:
        return False, "الرقم القومي مطلوب"
    cleaned = national_id.strip()
    if not NATIONAL_ID_PATTERN.match(cleaned):
        return False, "الرقم القومي يجب أن يكون 14 رقمًا"
    return True, None


def normalize_phone(phone: str) -> str:
    return phone.strip().replace(" ", "").replace("-", "")


def normalize_national_id(national_id: str) -> str:
    return national_id.strip()
