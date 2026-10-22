import os

from app.services.contract_document import _find_blanks, docx_to_editable_html, sanitize_document_html

TEMPLATE = os.path.join(os.path.dirname(__file__), "..", "..", "deploy", "templates", "nividia-contract-2026.docx")


def test_find_blanks_maps_context():
    keys = [b["key"] for b in _find_blanks("ثانيا : الأستاذ :  ..........    رقم قومي  .........  العنوان : -------")]
    assert keys == ["customer_name", "national_id", "address"]


def test_find_blanks_dates():
    keys = [b["key"] for b in _find_blanks("مدة هذا العقد سنة تبدأ من ....  / ... /  2026 م وينتهي في ... / ... / 2027 م")]
    assert keys == ["contract_start__day", "contract_start__month", "contract_end__day", "contract_end__month"]


def test_template_html_prefills_blanks():
    html = docx_to_editable_html(TEMPLATE, {"customer_name": "أحمد", "contract_start": "2026-11-05", "office_name": "7"})
    assert html.count("data-fill=") >= 20
    assert ">أحمد</span>" in html
    assert 'data-key="contract_start__day"' in html and ">05</span>" in html
    assert "(<span" in html and ">7</span>)" in html


def test_sanitize_strips_scripts_and_handlers():
    dirty = '<p onclick="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">b</a><span data-fill="1">c</span>'
    clean = sanitize_document_html(dirty)
    assert "script" not in clean and "onclick" not in clean and "javascript:" not in clean
    assert '<span data-fill="1">c</span>' in clean
