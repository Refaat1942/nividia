import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.docx_fields import analyze_template_fields, extract_docx_variables

path = sys.argv[1]
vars = extract_docx_variables(path)
fields = analyze_template_fields(path)
print(f"FILE: {path}")
print(f"RAW VARIABLES: {len(vars)}")
for v in vars:
    print(f"  - {v!r}")
print()
print("ANALYSIS:")
for f in fields:
    status = "OK" if f["auto_mapped"] else "NEEDS MAPPING"
    print(f"  [{status}] {f['raw']!r} -> {f['canonical']} ({f['label_ar']})")
