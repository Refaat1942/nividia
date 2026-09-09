import re
import sys
import zipfile
from pathlib import Path

path = sys.argv[1]

patterns = [
    (r"\{\{[^}]+\}\}", "jinja_double"),
    (r"\{[^}]+\}", "single_brace"),
    (r"«[^»]+»", "guillemet"),
    (r"<<[^>]+>>", "merge_angle"),
    (r"MERGEFIELD", "word_merge"),
    (r"w:instrText", "word_instr"),
]

found = {name: set() for _, name in patterns}

with zipfile.ZipFile(path, "r") as zf:
    xml_parts = [n for n in zf.namelist() if n.endswith(".xml")]
    full_text = ""
    for part in xml_parts:
        try:
            text = zf.read(part).decode("utf-8", errors="ignore")
        except Exception:
            continue
        full_text += text + "\n"
        for regex, name in patterns:
            for m in re.findall(regex, text):
                if name == "word_instr":
                    found[name].add(m[:200])
                else:
                    found[name].add(m)

# Also strip XML tags and look for jinja in plain text
plain = re.sub(r"<[^>]+>", "", full_text)
plain = re.sub(r"\s+", " ", plain)
jinja_plain = set(re.findall(r"\{\{[^}]+\}\}", plain))

out = Path(__file__).parent / "analysis_output.txt"
with out.open("w", encoding="utf-8") as f:
    f.write(f"FILE: {path}\n\n")
    f.write("XML parts: " + str(len(xml_parts)) + "\n\n")
    for name, items in found.items():
        f.write(f"=== {name} ({len(items)}) ===\n")
        for item in sorted(items)[:50]:
            f.write(f"  {item}\n")
        f.write("\n")
    f.write(f"=== jinja in plain text ({len(jinja_plain)}) ===\n")
    for item in sorted(jinja_plain):
        f.write(f"  {item}\n")
    f.write("\n=== sample plain text (first 3000 chars) ===\n")
    f.write(plain[:3000])

print(str(out))
