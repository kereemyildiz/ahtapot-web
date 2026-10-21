"""SolidWorks montajını (SB-09) GLB'ye çevirir — SolidWorks gerektirmez.

Kaynak: her parçanın Contents/DisplayLists bölümündeki yüzey üçgen şeritleri
(parça koordinatında, metre) + üst montajın swXmlContents/COMPINSTANCETREE
dönüşümleri. Bölüm başlıkları ZIP benzeri (14 00 06 00 08 00), adlar
nibble-döndürülmüş, veri raw deflate.

Yüzey kaydı: [şerit uzunlukları u32[k]] [köşeler f32x3[n]] [normaller f32x3[n]] ...
Her blok: (eleman_boyutu, etiket, 2, adet) başlığı + veri.

Kullanım: build_sb9k.py içinden modül olarak yüklenir (load("swdisplay")); tek başına
çalıştırılırsa: python -I tools/cad/swdisplay.py <Prod V4 dizini> <çıktı.glb> [--matrix row|col]
"""
import json
import os
import re
import struct
import sys
import zlib
import xml.etree.ElementTree as ET

import numpy as np

SIG = b"\x14\x00\x06\x00\x08\x00"
NS = "{http://www.solidworks.com/sw2003/schema}"


def rol4(b):
    return bytes(((x << 4) | (x >> 4)) & 0xFF for x in b)


def sections(path):
    data = open(path, "rb").read()
    out = {}
    i = 0
    while True:
        p = data.find(SIG, i)
        if p < 0:
            break
        try:
            _a, _b, comp, size, nlen = struct.unpack_from("<IIIII", data, p + 6)
        except struct.error:
            break
        if 0 < nlen < 512 and 0 < comp < len(data):
            name = rol4(data[p + 26 : p + 26 + nlen]).decode("latin-1", "replace")
            start = p + 26 + nlen
            try:
                raw = zlib.decompress(data[start : start + comp], -15)
                if len(raw) == size:
                    out.setdefault(name, raw)
                    i = start + comp
                    continue
            except zlib.error:
                pass
        i = p + 1
    return out


def blocks(buf):
    """(pos, size, count, payload) — başlığı tutan bloklar."""
    pos = 0
    n = len(buf)
    while pos + 16 <= n:
        size, tag, two, count = struct.unpack_from("<IIII", buf, pos)
        if two == 2 and size in (1, 4, 12) and 0 < count < 5_000_000 and pos + 16 + size * count <= n:
            yield pos, size, tag, count, buf[pos + 16 : pos + 16 + size * count]
            pos += 16 + size * count
        else:
            pos += 4


def faces(buf):
    """Her yüzey için (köşeler, normaller, üçgenler)."""
    bl = list(blocks(buf))
    res = []
    i = 0
    while i + 2 < len(bl):
        _, s0, t0, c0, p0 = bl[i]
        _, s1, t1, c1, p1 = bl[i + 1]
        _, s2, t2, c2, p2 = bl[i + 2]
        if s0 == 4 and s1 == 12 and s2 == 12 and c1 == c2:
            strips = np.frombuffer(p0, "<u4")
            if int(strips.sum()) == c1:
                v = np.frombuffer(p1, "<f4").reshape(-1, 3)
                nrm = np.frombuffer(p2, "<f4").reshape(-1, 3)
                tris = []
                base = 0
                for L in strips:
                    L = int(L)
                    for k in range(L - 2):
                        a, b, c = base + k, base + k + 1, base + k + 2
                        tris.append((a, b, c) if k % 2 == 0 else (b, a, c))
                    base += L
                t = np.array(tris, dtype=np.uint32).reshape(-1, 3)
                # Sarım yönünü normale göre düzelt (şerit başı yönü belirsiz olabilir).
                if len(t):
                    e1 = v[t[:, 1]] - v[t[:, 0]]
                    e2 = v[t[:, 2]] - v[t[:, 0]]
                    fn = np.cross(e1, e2)
                    flip = (fn * (nrm[t[:, 0]] + nrm[t[:, 1]] + nrm[t[:, 2]])).sum(1) < 0
                    t[flip] = t[flip][:, [1, 0, 2]]
                res.append((v, nrm, t))
                i += 3
                continue
        i += 1
    return res


def part_mesh(path):
    sec = sections(path)
    dl = sec.get("Contents/DisplayLists")
    if dl is None:
        return None, sec
    fs = faces(dl)
    if not fs:
        return None, sec
    vs, ns, ts = [], [], []
    off = 0
    for v, n, t in fs:
        vs.append(v)
        ns.append(n)
        ts.append(t + off)
        off += len(v)
    return (np.vstack(vs).astype(np.float32), np.vstack(ns).astype(np.float32), np.vstack(ts).astype(np.uint32)), sec


def visual_color(sec):
    vs = sec.get("ThirdPtyStore/VisualStates")
    if not vs:
        return None
    k = vs.find(b"moVisualProperties_c")
    if k < 0:
        return None
    r, g, b = vs[k + 20], vs[k + 21], vs[k + 22]
    return [r / 255, g / 255, b / 255]


def matrix(vals, mode):
    m = np.array(vals, dtype=np.float64).reshape(4, 4)
    if mode == "row":  # p' = p · M (öteleme son satırda)
        return m
    # kolon: döndürme bölümü devrik
    r = m.copy()
    r[:3, :3] = m[:3, :3].T
    return r


def main():
    root_dir = sys.argv[1]
    out_path = sys.argv[2]
    mode = "row"
    if "--matrix" in sys.argv:
        mode = sys.argv[sys.argv.index("--matrix") + 1]

    top = sections(os.path.join(root_dir, "SB-09 Su Isıtıcı.SLDASM"))
    tree = ET.fromstring(top["swXmlContents/COMPINSTANCETREE"])
    files = {f.get("id"): f.get("swPath") for f in tree.iter(NS + "swFile")}
    models = {m.get("id"): m for m in tree.iter(NS + "swModel")}

    def local_path(sw_path):
        rel = re.split(r"Yeni Cizim Prod V4[\\/]", sw_path)
        if len(rel) < 2:
            return None
        p = os.path.join(root_dir, *re.split(r"[\\/]", rel[1]))
        return p if os.path.exists(p) else None

    top_model = next(m for m in models.values() if m.get("swName") == "SB-09 Su Isıtıcı")
    instances = []  # (ad, model_id, dünya_matrisi)

    def walk(model, parent_m, prefix):
        for r in model.findall(NS + "swReference"):
            if r.get("swSuppressed") == "YES" or r.get("swHidden") == "YES":
                continue
            vals = [float(x) for x in r.get("swTransform").split()]
            m = matrix(vals, mode) @ parent_m
            child = models[r.get("swModelRef")]
            name = f"{prefix}{r.get('swName')}-{r.get('swReferenceNumber')}"
            if child.findall(NS + "swReference"):
                walk(child, m, name + "/")
            else:
                instances.append((name, r.get("swModelRef"), m))

    walk(top_model, np.eye(4), "")

    meshes = {}
    skipped = []
    for name, mid, _ in instances:
        if mid in meshes:
            continue
        sw_path = files.get(models[mid].get("swFileRef"))
        lp = local_path(sw_path) if sw_path else None
        if not lp:
            skipped.append((name, sw_path))
            meshes[mid] = None
            continue
        mesh, sec = part_mesh(lp)
        meshes[mid] = (mesh, visual_color(sec), models[mid].get("swName")) if mesh else None
        if not mesh:
            skipped.append((name, lp))

    # --- GLB yaz ---
    bin_chunks = bytearray()
    buffer_views, accessors, gl_meshes, materials, nodes = [], [], [], [], []
    mesh_index = {}

    def add_view(arr, target):
        nonlocal bin_chunks
        while len(bin_chunks) % 4:
            bin_chunks += b"\0"
        off = len(bin_chunks)
        bin_chunks += arr.tobytes()
        buffer_views.append({"buffer": 0, "byteOffset": off, "byteLength": arr.nbytes, "target": target})
        return len(buffer_views) - 1

    for mid, entry in meshes.items():
        if not entry:
            continue
        (v, n, t), color, mname = entry
        n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
        bv_p = add_view(v, 34962)
        accessors.append({"bufferView": bv_p, "componentType": 5126, "count": len(v), "type": "VEC3",
                          "min": v.min(0).tolist(), "max": v.max(0).tolist()})
        a_p = len(accessors) - 1
        bv_n = add_view(n.astype(np.float32), 34962)
        accessors.append({"bufferView": bv_n, "componentType": 5126, "count": len(n), "type": "VEC3"})
        a_n = len(accessors) - 1
        idx = t.reshape(-1).astype(np.uint32)
        bv_i = add_view(idx, 34963)
        accessors.append({"bufferView": bv_i, "componentType": 5125, "count": len(idx), "type": "SCALAR"})
        a_i = len(accessors) - 1
        materials.append({"name": mname, "pbrMetallicRoughness": {
            "baseColorFactor": (color or [0.75, 0.75, 0.78]) + [1.0], "metallicFactor": 0.2, "roughnessFactor": 0.5}})
        gl_meshes.append({"name": mname, "primitives": [{"attributes": {"POSITION": a_p, "NORMAL": a_n},
                                                          "indices": a_i, "material": len(materials) - 1}]})
        mesh_index[mid] = len(gl_meshes) - 1

    for name, mid, m in instances:
        if mid not in mesh_index:
            continue
        # glTF: kolon-major, kolon-vektör (p' = M p). Satır-vektör M_row → M_col = M_row^T.
        col = m.T
        nodes.append({"name": name, "mesh": mesh_index[mid], "matrix": col.T.reshape(-1).tolist()})

    gltf = {"asset": {"version": "2.0", "generator": "sw2glb (ahtapot)"},
            "scene": 0, "scenes": [{"nodes": list(range(len(nodes)))}],
            "nodes": nodes, "meshes": gl_meshes, "materials": materials,
            "accessors": accessors, "bufferViews": buffer_views,
            "buffers": [{"byteLength": len(bin_chunks)}]}
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    while len(bin_chunks) % 4:
        bin_chunks += b"\0"
    total = 12 + 8 + len(js) + 8 + len(bin_chunks)
    with open(out_path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(bin_chunks), 0x004E4942) + bytes(bin_chunks))

    report = {"instances": len(instances), "nodes": len(nodes), "meshes": len(gl_meshes),
              "triangles": int(sum(len(e[0][2]) for e in meshes.values() if e)),
              "bytes": total, "skipped": skipped,
              "parts": {e[2]: {"tris": int(len(e[0][2])), "color": e[1]} for e in meshes.values() if e}}
    sys.stdout.buffer.write(json.dumps(report, ensure_ascii=False, indent=1).encode("utf-8"))


if __name__ == "__main__":
    main()
