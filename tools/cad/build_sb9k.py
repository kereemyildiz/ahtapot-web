"""SB-09 montajı → GLB: Parasolid B-rep'ten (düz + silindir + koni) ve
SolidWorks ekran listelerinden (B-yüzeyler, satın alınmış parçalar) tam ağ.

Kullanım: python -I tools/cad/build_sb9k.py <Prod V4 dizini> <çıktı.glb> [rapor.json]

Web çıktısı kasıtlı olarak üretim verisi değildir: parça adları nötr kimliklere
çevrilir (dosya adı, revizyon, tedarikçi yazmaz), WEB_PARTS'ta olmayan parça
atılır, kontrolcünün tedarikçi modeli (iç devreleriyle) yerine sınır kutusu
konur. Kenar çizgileri (SolidWorks görünümü) burada hesaplanıp GLB'ye çizgi
olarak gömülür; tarayıcı hesaplamaz.
"""
import importlib.util
import json
import os
import re
import struct
import sys
import zlib
import xml.etree.ElementTree as ET

import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(BASE, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


sw = load("swdisplay")
xr = load("xtread")
xm = load("xtmesh")
xc = load("xtcurved")
NS = "{http://www.solidworks.com/sw2003/schema}"

# CAD parça adı (düzenli ifade) → web kimliği. Sıra önemli: ilk eşleşen.
# Listede olmayan parça web modeline girmez.
WEB_PARTS = [
    (r"ANA_SASE", "govde"),
    (r"KABIN_IC_DUVAR_LEVHA_A", "ic-duvar-a"),
    (r"KABIN_IC_DUVAR_LEVHA_B", "ic-duvar-b"),
    (r"TEMPERATURE-CONTROLLER", "kontrolcu"),
    (r"PUSHBUTTON", "dugme"),
    (r"IEC-AC-INLET", "guc-girisi"),
    (r"EMI-FILTER", "emi-filtre"),
    (r"TABAN_PLAKASI", "taban"),
    (r"SSR", "ssr"),
    (r"POWER-SUPPLY", "guc-kaynagi"),
    (r"ALT_TEPSI", "alt-tepsi"),
    (r"ISI_TRANSFER", "isi-plakasi"),
    (r"ARALAYICI", "aralayici"),
    (r"HEATER-PAD", "isitici"),
    (r"PROP_SOKET", "prob-soketi"),
    (r"PROP BA", "prob-baglantisi"),
    (r"POWER-CORD", "kablo"),
    (r"SU_KABI", "hazne"),
    (r"derlin", "tutamak"),
    (r"AYDINLATMA_CAMI", "led-cami"),
]
# Görünmeyen içi yerine sınır kutusu konan parçalar (ön yüzü sitede çizilir).
PROXY_BOX = {"kontrolcu"}
EDGE_ANGLE_DEG = 32  # three.js EdgesGeometry ile aynı eşik


def web_id(pname):
    for pat, wid in WEB_PARTS:
        if re.search(pat, pname):
            return wid
    return None


def box_mesh(v):
    lo, hi = v.min(0), v.max(0)
    c = np.array([[lo[0], lo[1], lo[2]], [hi[0], lo[1], lo[2]], [hi[0], hi[1], lo[2]], [lo[0], hi[1], lo[2]],
                  [lo[0], lo[1], hi[2]], [hi[0], lo[1], hi[2]], [hi[0], hi[1], hi[2]], [lo[0], hi[1], hi[2]]])
    quads = [((0, 3, 2, 1), (0, 0, -1)), ((4, 5, 6, 7), (0, 0, 1)), ((0, 1, 5, 4), (0, -1, 0)),
             ((3, 7, 6, 2), (0, 1, 0)), ((0, 4, 7, 3), (-1, 0, 0)), ((1, 2, 6, 5), (1, 0, 0))]
    V, N, T = [], [], []
    for q, n in quads:
        b = len(V)
        V += [c[i] for i in q]
        N += [n] * 4
        T += [(b, b + 1, b + 2), (b, b + 2, b + 3)]
    return np.array(V, float), np.array(N, float), np.array(T, np.int64)


def feature_edges(v, t, angle_deg=EDGE_ANGLE_DEG):
    """Sınır kenarları + iki yüz arasındaki açısı eşikten büyük kenarlar.
    Köşeler 1 µm ızgarada birleştirilir (yüzler ayrı üçgenlendiği için)."""
    key = np.round(v / 1e-6).astype(np.int64)
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    pos = np.zeros((len(uniq), 3))
    pos[inv] = v
    tw = inv[t]
    a, b, c = pos[tw[:, 0]], pos[tw[:, 1]], pos[tw[:, 2]]
    fn = np.cross(b - a, c - a)
    area = np.linalg.norm(fn, axis=1)
    ok = (area > 1e-14) & (tw[:, 0] != tw[:, 1]) & (tw[:, 1] != tw[:, 2]) & (tw[:, 0] != tw[:, 2])
    tw, fn = tw[ok], fn[ok] / area[ok, None]
    e = np.vstack([tw[:, [0, 1]], tw[:, [1, 2]], tw[:, [2, 0]]])
    e.sort(axis=1)
    f = np.tile(np.arange(len(tw)), 3)
    k = e[:, 0] * len(uniq) + e[:, 1]
    order = np.argsort(k, kind="stable")
    k, e, f = k[order], e[order], f[order]
    start = np.r_[True, k[1:] != k[:-1]]
    gid = np.cumsum(start) - 1
    count = np.bincount(gid)
    first = np.flatnonzero(start)
    draw = count != 2
    two = np.flatnonzero(count == 2)
    i0 = first[two]
    cos = (fn[f[i0]] * fn[f[i0 + 1]]).sum(1)
    draw[two] = cos < np.cos(np.radians(angle_deg))
    edges = e[first[draw]]
    if not len(edges):
        return np.zeros((0, 3)), np.zeros((0, 2), np.int64)
    used, rel = np.unique(edges.reshape(-1), return_inverse=True)
    return pos[used], rel.reshape(-1, 2)


def partition_stream(sec):
    d = sec.get("Contents/Config-0-Partition")
    if not d:
        return None
    pos = 0
    while True:
        i = d.find(b"\x78\x01", pos)
        if i < 0:
            return None
        try:
            do = zlib.decompressobj()
            out = do.decompress(d[i:])
            if out.startswith(b"PS") and b"(partition)" in out[:80]:
                return out
            pos = i + (len(d[i:]) - len(do.unused_data))
        except zlib.error:
            pos = i + 1


def is_planar(n):
    nn = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    return float((nn @ nn[0]).min()) > 0.9998


def on_known_surface(v, planes, surfs, tol=1e-4):
    for P, Nn in planes:
        if np.abs((v - P) @ Nn).max() < tol:
            return True
    for s in surfs:
        if s.distance(v).max() < tol:
            return True
    return False


def merge(parts):
    V, N, T = [], [], []
    off = 0
    for v, n, t in parts:
        if len(v) == 0 or len(t) == 0:
            continue
        V.append(np.asarray(v, np.float64))
        N.append(np.asarray(n, np.float64))
        T.append(np.asarray(t, np.int64) + off)
        off += len(v)
    if not V:
        return None
    return np.vstack(V), np.vstack(N), np.vstack(T)


def dl_mesh(faces, keep=lambda v, n: True):
    parts = []
    for v, n, t in faces:
        if keep(v, n):
            parts.append((v, n, t))
    return merge(parts)


def part_mesh(path, extra_faces=None):
    """(mesh, kaynak, renk)"""
    sec = sw.sections(path)
    color = sw.visual_color(sec)
    dl = sec.get("Contents/DisplayLists")
    dl_faces = sw.faces(dl) if dl else []
    ps = partition_stream(sec)
    nodes = None
    if ps:
        try:
            nodes = xr.read_xt(ps, os.path.join(BASE, "xtbase.json"))["nodes"]
        except Exception as e:  # şema farkı vb.
            print("  XT okunamadı:", os.path.basename(path), e)
    n_faces = sum(1 for v in (nodes or {}).values() if v[1] == "FACE")
    if nodes and n_faces:
        pv, pn, pt, pst = xm.planar_faces(nodes)
        cv, cn, ct, surfs, cst = xc.curved_faces(nodes)
        planes = xc.planes_of(nodes)
        others = [] if cst["other"] == 0 else [
            (v, n, t) for v, n, t in (dl_faces + (extra_faces or [])) if not on_known_surface(v, planes, surfs)
        ]
        mesh = merge([(pv, pn, pt), (cv, cn, ct)] + others)
        return mesh, f"XT düz {pst['planar']}/{pst['failed']} sil+koni {cst['cyl_cone']}/{cst['failed']} diğer DL {len(others)}", color
    # Parasolid yüzeysiz (dışarıdan aktarılmış): en zengin ekran verisi
    cand = [("DL", dl_faces), ("ASM", extra_faces or [])]
    name, best = max(cand, key=lambda c: sum(len(t) for _, _, t in c[1]))
    return dl_mesh(best), f"{name} {len(best)} yüz", color


def asm_faces_index(asm_sec):
    """Montaj FaceTessellations: bileşen yolu → o bileşenin yüz listesi."""
    dname = "FaceTessellations/Directory"
    if dname not in asm_sec:
        return {}
    d = asm_sec[dname]
    streams = {k.split("/")[1]: v for k, v in asm_sec.items() if k.startswith("FaceTessellations/") and k != dname}
    entries = []
    pos = 0
    while True:
        p = d.find(b"\xff\xfe\xff", pos)
        if p < 0:
            break
        n = d[p + 3]
        name = d[p + 4 : p + 4 + 2 * n].decode("utf-16-le", "replace")
        end = p + 4 + 2 * n
        if not re.fullmatch(r"\d{3}-\d{3}-\d{3}", name) and name:
            q = d.find(b"\xff\xfe\xff", end)
            if q > 0:
                ident = d[q - 8 : q]
                sl = d[q + 3]
                sname = d[q + 4 : q + 4 + 2 * sl].decode("utf-16-le", "replace")
                entries.append((name, ident, sname))
        pos = end
    out = {}
    for sname, buf in streams.items():
        hits = []
        for name, ident, sn in entries:
            if sn != sname:
                continue
            k = buf.find(ident)
            if k >= 0:
                hits.append((k, name))
        hits.sort()
        for i, (k, name) in enumerate(hits):
            e = hits[i + 1][0] if i + 1 < len(hits) else len(buf)
            out[name] = sw.faces(buf[k:e])
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    root_dir = sys.argv[1]
    out_path = sys.argv[2]
    report_path = sys.argv[3] if len(sys.argv) > 3 else None
    def local_path(sw_path):
        rel = re.split(r"Yeni Cizim Prod V4[\\/]", sw_path or "")
        if len(rel) < 2:
            return None
        p = os.path.join(root_dir, *re.split(r"[\\/]", rel[1]))
        return p if os.path.exists(p) else None

    # Montaj tessellation akışları (satın alınmış parçalar için).
    asm_faces = {}
    for sub in ("SB-09 Su Isıtıcı.SLDASM", "Assembly/Isıtıcı_ve_Alt_Tepsi.SLDASM", "Assembly/Taban Grubu.SLDASM",
                "Assembly/Ana Kabin Grubu.SLDASM", "Assembly/Teflon_Tepsi_Grubu.SLDASM"):
        p = os.path.join(root_dir, *sub.split("/"))
        if os.path.exists(p):
            sub_name = os.path.splitext(os.path.basename(p))[0]
            for k, v in asm_faces_index(sw.sections(p)).items():
                asm_faces.setdefault(k, v)
                asm_faces.setdefault(k.split("/")[-1] + "#" + sub_name, v)

    def collect(asm_rel, prefix_root=""):
        """Montaj ağacını dolaş: (tam ad, grup, parça dosyası, dünya matrisi, kısa ad)."""
        sec = sw.sections(os.path.join(root_dir, *asm_rel.split("/")))
        tree = ET.fromstring(sec["swXmlContents/COMPINSTANCETREE"])
        files = {f.get("id"): f.get("swPath") for f in tree.iter(NS + "swFile")}
        models = {m.get("id"): m for m in tree.iter(NS + "swModel")}
        top_name = os.path.splitext(os.path.basename(asm_rel))[0]
        top_model = next(m for m in models.values() if m.get("swName") == top_name)
        out = []

        def walk(model, parent_m, prefix, sub):
            for r in model.findall(NS + "swReference"):
                if r.get("swSuppressed") == "YES" or r.get("swHidden") == "YES":
                    continue
                vals = [float(x) for x in r.get("swTransform").split()]
                m = sw.matrix(vals, "row") @ parent_m
                child = models[r.get("swModelRef")]
                name = f"{r.get('swName')}-{r.get('swReferenceNumber')}"
                if child.findall(NS + "swReference"):
                    walk(child, m, prefix + name + "/", child.get("swName"))
                else:
                    path = local_path(files.get(child.get("swFileRef")))
                    out.append((prefix + name, sub, path, m, name, child.get("swName")))

        walk(top_model, np.eye(4), prefix_root, top_name)
        return out

    instances = collect("SB-09 Su Isıtıcı.SLDASM")
    teflon = collect("Assembly/Teflon_Tepsi_Grubu.SLDASM", "Teflon_Tepsi_Grubu-1/")

    meshes = {}
    report = {}

    def ensure(path, short, sub, pname):
        if path in meshes:
            return
        if not path:
            report[pname] = "dosya yok (atlandı)"
            meshes[path] = None
            return
        extra = None
        for k, v in asm_faces.items():
            if k.split("/")[-1].startswith(short + "@") or k == short + "#" + sub:
                extra = v
                break
        mesh, src, color = part_mesh(path, extra)
        meshes[path] = (mesh, color, pname) if mesh else None
        report[pname] = f"{src}; üçgen {len(mesh[2]) if mesh else 0}"
        print(pname, "→", report[pname])

    for full, sub, path, m, short, pname in instances + teflon:
        ensure(path, short, sub, pname)

    def world_bbox(insts, pick=None):
        pts = []
        for full, sub, path, m, short, pname in insts:
            if not meshes.get(path) or (pick and pick not in pname):
                continue
            v = meshes[path][0][0]
            pts.append((np.c_[v, np.ones(len(v))] @ m)[:, :3])
        a = np.vstack(pts)
        return a.min(0), a.max(0)

    # Teflon hazne montajda yok: alt tepsinin ortasına hizala, tabanı ısı
    # transfer plakasının üstüne otursun (kılavuz: hazne plakaya tam temas eder).
    if teflon:
        tlo, thi = world_bbox(instances, "ALT_TEPSI")
        plo, phi = world_bbox(instances, "ISI_TRANSFER")
        klo, khi = world_bbox(teflon, "SU_KABI")
        shift = np.array([(tlo[0] + thi[0]) / 2 - (klo[0] + khi[0]) / 2,
                          phi[1] - klo[1],
                          (tlo[2] + thi[2]) / 2 - (klo[2] + khi[2]) / 2])
        T = np.eye(4)
        T[3, :3] = shift
        teflon = [(f, s_, p, m @ T, sh, pn) for f, s_, p, m, sh, pn in teflon]
        print("hazne kaydırma (mm):", np.round(shift * 1000, 1))
    instances = instances + teflon
    report["_bbox_mm"] = [list(np.round(x * 1000, 1)) for x in world_bbox(instances)]


    # --- Çapalar: sitede ekran, düğmeler, su ve logo için (dünya koordinatı, m) ---
    def inst(pick):
        return [(f, s_, p, m, sh, pn) for f, s_, p, m, sh, pn in instances if pick in pn and meshes.get(p)]

    def front_of(item, normal):
        """Parçanın ön yüz merkezi: yerel ekseni normale en çok hizalanan uç."""
        f, s_, p, m, sh, pn = item
        v = meshes[p][0][0]
        lo, hi = v.min(0), v.max(0)
        R = m[:3, :3]
        dots = R @ normal
        i = int(np.argmax(np.abs(dots)))
        c = (lo + hi) / 2
        c[i] = hi[i] if dots[i] > 0 else lo[i]
        wx = int(np.argmax(np.abs(R @ np.array([1.0, 0, 0]))))
        rest = [k for k in range(3) if k not in (i, wx)][0]
        world = np.r_[c, 1.0] @ m
        return {"center": world[:3].tolist(), "width": float(hi[wx] - lo[wx]), "height": float(hi[rest] - lo[rest])}

    slant_n = np.array([0.0, 0.766044, 0.642788])
    anchors = {"slantNormal": slant_n.tolist()}
    ctrl = inst("TEMPERATURE-CONTROLLER")
    if ctrl:
        anchors["controller"] = front_of(ctrl[0], slant_n)
    btns = sorted(inst("PUSHBUTTON"), key=lambda it: it[3][3, 0])
    anchors["buttons"] = [front_of(b, slant_n) for b in btns]
    kab = inst("SU_KABI")
    if kab:
        lo, hi = world_bbox(kab)
        wall = 0.002
        floor = float(lo[1] + wall)
        anchors["water"] = {"min": [float(lo[0] + wall), floor, float(lo[2] + wall)],
                            "max": [float(hi[0] - wall), float(hi[1]), float(hi[2] - wall)],
                            "levelFull": float(floor + 0.62 * (hi[1] - floor)),
                            "levelLow": float(floor + 0.12 * (hi[1] - floor))}
    if ctrl and btns:
        c = np.array(anchors["controller"]["center"])
        sase_lo, sase_hi = world_bbox(inst("ANA_SASE"))
        left_free = (sase_lo[0] + min(np.array(b["center"])[0] for b in anchors["buttons"])) / 2
        logo = c.copy()
        logo[0] = left_free
        anchors["logo"] = {"center": (logo + slant_n * 0.0004).tolist(), "width": 0.09}
    lo, hi = world_bbox(instances)
    anchors["bbox"] = [lo.tolist(), hi.tolist()]
    json.dump(anchors, open(os.path.splitext(out_path)[0] + ".anchors.json", "w", encoding="utf-8"), indent=1)
    print("çapalar:", {k: (v if k != "buttons" else len(v)) for k, v in anchors.items() if k in ("controller", "logo", "buttons")})

    # --- Web modeli: nötr adlar, listede olmayanı at, tedarikçi içini kutuya çevir ---
    web_instances = []
    counts = {}
    for full, sub, path, m, short, pname in instances:
        wid = web_id(pname)
        if wid is None:
            print("  web modeline alınmadı:", pname)
            continue
        counts[wid] = counts.get(wid, 0) + 1
        web_instances.append((wid, path, m))
    seen = {}
    for i, (wid, path, m) in enumerate(web_instances):
        seen[wid] = seen.get(wid, 0) + 1
        name = wid if counts[wid] == 1 else f"{wid}-{seen[wid]}"
        web_instances[i] = (name, wid, path, m)
    web_mesh_id = {}
    for name, wid, path, m in web_instances:
        if not meshes.get(path):
            continue
        web_mesh_id.setdefault(path, wid)
        if wid in PROXY_BOX and not meshes[path][2].startswith("proxy:"):
            (v, n, t), color, pname = meshes[path]
            meshes[path] = (box_mesh(v), color, "proxy:" + pname)

    # --- GLB ---
    bin_chunks = bytearray()
    buffer_views, accessors, gl_meshes, materials, nodes = [], [], [], [], []
    mesh_index = {}
    edge_count = {}
    materials += [{"name": "parca", "pbrMetallicRoughness": {"baseColorFactor": [0.75, 0.75, 0.78, 1.0],
                   "metallicFactor": 0.1, "roughnessFactor": 0.55}, "doubleSided": True},
                  {"name": "kenar", "pbrMetallicRoughness": {"baseColorFactor": [0.1, 0.1, 0.12, 1.0]}}]

    def add_view(arr, target):
        nonlocal bin_chunks
        while len(bin_chunks) % 4:
            bin_chunks += b"\0"
        off = len(bin_chunks)
        bin_chunks += arr.tobytes()
        buffer_views.append({"buffer": 0, "byteOffset": off, "byteLength": arr.nbytes, "target": target})
        return len(buffer_views) - 1

    for mid, entry in meshes.items():
        if not entry or mid not in web_mesh_id:
            continue
        (v, n, t), color, _ = entry
        mname = web_mesh_id[mid]
        v = v.astype(np.float32)
        n = (n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)).astype(np.float32)
        bv = add_view(v, 34962)
        accessors.append({"bufferView": bv, "componentType": 5126, "count": len(v), "type": "VEC3",
                          "min": v.min(0).tolist(), "max": v.max(0).tolist()})
        ap = len(accessors) - 1
        bv = add_view(n, 34962)
        accessors.append({"bufferView": bv, "componentType": 5126, "count": len(n), "type": "VEC3"})
        an = len(accessors) - 1
        idx = t.reshape(-1).astype(np.uint32)
        bv = add_view(idx, 34963)
        accessors.append({"bufferView": bv, "componentType": 5125, "count": len(idx), "type": "SCALAR"})
        ai = len(accessors) - 1
        # Malzemeler sitede parça tablosundan atanır: modelde yalnız iki ortak
        # malzeme (yükleyici 40 malzeme oluşturup atmasın).
        prims = [{"attributes": {"POSITION": ap, "NORMAL": an}, "indices": ai, "material": 0}]
        # Kenar çizgileri: aynı ağda ikinci bir LINES ilkeli
        ev, ei = feature_edges(np.asarray(v, float), t)
        if len(ei):
            ev = ev.astype(np.float32)
            bv = add_view(ev, 34962)
            accessors.append({"bufferView": bv, "componentType": 5126, "count": len(ev), "type": "VEC3",
                              "min": ev.min(0).tolist(), "max": ev.max(0).tolist()})
            ae = len(accessors) - 1
            eidx = ei.reshape(-1).astype(np.uint32)
            bv = add_view(eidx, 34963)
            accessors.append({"bufferView": bv, "componentType": 5125, "count": len(eidx), "type": "SCALAR"})
            prims.append({"attributes": {"POSITION": ae}, "indices": len(accessors) - 1, "mode": 1, "material": 1})
        edge_count[mname] = edge_count.get(mname, 0) + len(ei)
        gl_meshes.append({"name": mname, "primitives": prims})
        mesh_index[mid] = len(gl_meshes) - 1

    for name, wid, path, m in web_instances:
        if path not in mesh_index:
            continue
        nodes.append({"name": name, "mesh": mesh_index[path], "matrix": m.reshape(-1).tolist(),
                      "extras": {"part": wid}})

    gltf = {"asset": {"version": "2.0", "generator": "ahtapot"},
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
    print("GLB", out_path, total, "bayt;", sum(len(meshes[p][0][2]) for p in mesh_index), "üçgen;",
          sum(edge_count.values()), "kenar")
    if report_path:
        json.dump(report, open(report_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
