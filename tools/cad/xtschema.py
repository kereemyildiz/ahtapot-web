"""Parasolid XT Format Reference (düz metin) → temel şema tablosu (JSON).

Her "struct NAME_s [== BASE_s] // ... { ... };" bloğundan alan adlarını ve
$kodlarını sırayla toplar; düğüm türü numaralarını "Node Types" tablosundan eşler.
Kullanım: python -I xtschema.py <xtraw.txt> <çıktı.json>
"""
import json
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()

types = {}
m = re.search(r"Node name Node\s*type\s*Visible at PK Has node-id(.*?)Node Classes", text, re.S)
for name, num in re.findall(r"^([A-Z_]+) (\d+) (?:Yes|No)", m.group(1), re.M):
    types[name] = int(num)

STRUCT_RE = re.compile(
    r"struct ([A-Z_]+)_s(?:\s*==\s*[A-Z_]+_s)?\s*//[^\n]*\n(?:[^{;\n]*\n){0,3}?\s*\{(.*?)\};",
    re.S,
)
CODE_RE = re.compile(r"\$([a-z])(\[(\d*)\])?")

# Belgede biçimi bozuk çıkan üç tanım (alanlar belgeden elle okundu).
MANUAL = {
    "TRANSFORM": [["node_id", "d", 0], ["owner", "p", 0], ["next", "p", 0], ["previous", "p", 0],
                  ["rotation_matrix", "f", 9], ["translation_vector", "v", 0], ["scale", "f", 0],
                  ["flag", "d", 0], ["perspective_vector", "v", 0]],
    "KEY": [["string", "c", 1]],
    "ATTRIB_DEF": [["next", "p", 0], ["identifier", "p", 0], ["type_id", "d", 0], ["actions", "u", 8],
                   ["field_names", "p", 0], ["legal_owners", "l", 14], ["fields", "u", 1]],
}

structs = {}
for sm in STRUCT_RE.finditer(text):
    name, body = sm.group(1), sm.group(2)
    if name in structs and "fields" in structs[name]:
        continue
    head = text[sm.start() : sm.start(2)]
    codes = CODE_RE.findall(head + body)
    decls = []
    for part in re.split(r";", re.sub(r"//[^\n]*", " ", body)):
        part = " ".join(part.split())
        if not part:
            continue
        fm = re.search(r"\**\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\[[^\]]*\])*\s*$", part)
        if fm:
            decls.append(fm.group(1))
    if len(codes) != len(decls):
        structs[name] = {"error": f"codes={len(codes)} decls={len(decls)}"}
        continue
    fields = []
    for fname, (code, arr, cnt) in zip(decls, codes):
        n = 0
        if arr:
            n = 1 if cnt == "" else int(cnt)
        fields.append([fname, code, n])
    structs[name] = {"fields": fields}

for k, v in MANUAL.items():
    structs[k] = {"fields": v}

out = {"types": types, "structs": structs}
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), indent=1)
bad = {k: v["error"] for k, v in structs.items() if "error" in v}
missing = [t for t in types if t not in structs or "fields" not in structs[t]]
print("types", len(types), "structs", len(structs), "bad", bad, "types without struct", missing)
for t in ["SHELL", "PLANE", "CYLINDER", "CONE", "LINE", "CIRCLE", "B_CURVE", "TRIMMED_CURVE", "SP_CURVE", "B_SURFACE"]:
    s = structs.get(t)
    print(t, types.get(t), s and s.get("fields"))
