from app.services.docx_fields import canonicalize_field


def test_canonicalize_english():
    assert canonicalize_field("customer_name") == "customer_name"


def test_canonicalize_arabic():
    assert canonicalize_field("اسم_العميل") == "customer_name"
    assert canonicalize_field("الرقم القومي") == "national_id"


def test_canonicalize_unknown():
    assert canonicalize_field("unknown_field_xyz") is None
