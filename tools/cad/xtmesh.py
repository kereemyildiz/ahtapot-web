"""Parasolid B-rep (xtread çıktısı) → düz yüzeylerin üçgen ağı.

Her PLANE yüzeyi için döngüler dolaşılır (FACE → LOOP → FIN), kenar eğrileri
örneklenir (LINE, CIRCLE, ELLIPSE, TRIMMED_CURVE, B_CURVE/NURBS; diğerleri
düz çizgi), delikler dış sınıra köprülenip kulak kırpma ile üçgenlenir.
Eğri yüzeyler bu modülde değil: SolidWorks ekran listesindeki üçgenlerden gelir.
"""
import math

import numpy as np

TWO_PI = 2 * math.pi


class Model:
    def __init__(self, nodes):
        self.n = nodes

    def get(self, idx):
        if not idx:
            return None
        v = self.n.get(idx)
        return v

    def vals(self, idx):
        v = self.get(idx)
        return v[2] if v else None

    def name(self, idx):
        v = self.get(idx)
        return v[1] if v else None


# ---------- NURBS ----------

def nurbs_polyline(m, nurbs_idx, samples=96):
    nc = m.vals(nurbs_idx)
    if not nc:
        return None
    deg = nc["degree"]
    dim = nc["vertex_dim"]
    verts = np.array(m.vals(nc["bspline_vertices"])["vertices"], dtype=float).reshape(-1, dim)
    knots = m.vals(nc["knots"])["knots"]
    mult = m.vals(nc["knot_mult"])["mult"]
    U = []
    for k, mu in zip(knots, mult):
        U += [k] * mu
    U = np.array(U, dtype=float)
    rational = nc["rational"]
    if rational:
        w = verts[:, -1:]
        H = np.c_[verts[:, :-1] * w, w]
    else:
        H = np.c_[verts, np.ones(len(verts))]
    n = len(H) - 1
    t0, t1 = U[deg], U[n + 1]
    ts = np.linspace(t0, t1, samples)
    out = []
    for t in ts:
        # span
        k = np.searchsorted(U, t, side="right") - 1
        k = min(max(k, deg), n)
        d = [H[j + k - deg].copy() for j in range(deg + 1)]
        for r in range(1, deg + 1):
            for j in range(deg, r - 1, -1):
                denom = U[j + 1 + k - r] - U[j + k - deg]
                alpha = 0 if denom == 0 else (t - U[j + k - deg]) / denom
                d[j] = (1 - alpha) * d[j - 1] + alpha * d[j]
        p = d[deg]
        out.append(p[:-1] / p[-1])
    return np.array(out), bool(nc.get("periodic")) or bool(nc.get("closed"))


# ---------- eğri örnekleme ----------

def frame(normal, x_axis):
    nz = np.array(normal, float)
    nx = np.array(x_axis, float)
    ny = np.cross(nz, nx)
    return nx, ny, nz


def arc_points(center, nx, ny, r1, r2, A, B, natural, full, seg_full):
    c = np.array(center, float)

    def ang(p):
        v = np.asarray(p) - c
        return math.atan2(v @ ny / r2, v @ nx / r1)

    a0 = ang(A) if A is not None else 0.0
    if full or B is None:
        sweep = TWO_PI if natural else -TWO_PI
    else:
        a1 = ang(B)
        if natural:
            sweep = (a1 - a0) % TWO_PI
            if sweep < 1e-9:
                sweep = TWO_PI
        else:
            sweep = -((a0 - a1) % TWO_PI)
            if sweep > -1e-9:
                sweep = -TWO_PI
    steps = max(2, int(math.ceil(abs(sweep) / TWO_PI * seg_full)))
    pts = []
    for i in range(steps):  # son nokta (B) dahil değil
        a = a0 + sweep * i / steps
        pts.append(c + r1 * math.cos(a) * nx + r2 * math.sin(a) * ny)
    return pts


def sub_polyline(poly, closed, A, B, natural, full):
    iA = int(np.argmin(((poly - A) ** 2).sum(1))) if A is not None else 0
    iB = int(np.argmin(((poly - B) ** 2).sum(1))) if B is not None else iA
    n = len(poly)
    if full:
        idx = list(range(iA, iA + n)) if natural else list(range(iA, iA - n, -1))
        return [poly[i % n] for i in idx]
    if natural:
        if iB >= iA:
            idx = range(iA, iB)
        elif closed:
            idx = list(range(iA, n)) + list(range(0, iB))
        else:
            idx = range(iA, iB, -1)
    else:
        if iB <= iA:
            idx = range(iA, iB, -1)
        elif closed:
            idx = list(range(iA, -1, -1)) + list(range(n - 1, iB, -1))
        else:
            idx = range(iA, iB)
    pts = [A if A is not None else poly[iA]] + [poly[i] for i in list(idx)[1:]]
    return pts


def curve_points(m, cidx, A, B, natural, full, depth=0):
    """A'dan B'ye (B hariç) nokta listesi; bilinmeyen eğride yalnız A."""
    name = m.name(cidx)
    c = m.vals(cidx)
    if c is None or depth > 3:
        return [A] if A is not None else []
    if name == "LINE":
        return [A] if A is not None else []
    if name == "CIRCLE":
        nx, ny, _ = frame(c["normal"], c["x_axis"])
        r = c["radius"]
        seg = 64 if r > 0.004 else 32
        return arc_points(c["centre"], nx, ny, r, r, A, B, natural, full, seg)
    if name == "ELLIPSE":
        nx, ny, _ = frame(c["normal"], c["x_axis"])
        return arc_points(c["centre"], nx, ny, c["major_radius"], c["minor_radius"], A, B, natural, full, 64)
    if name == "TRIMMED_CURVE":
        return curve_points(m, c["basis_curve"], A, B, natural, full, depth + 1)
    if name == "SP_CURVE":
        if c.get("original"):
            return curve_points(m, c["original"], A, B, natural, full, depth + 1)
        surf = m.vals(c.get("surface"))
        bc = m.vals(c.get("b_curve"))
        if surf is not None and m.name(c["surface"]) == "PLANE" and bc is not None:
            res = nurbs_polyline(m, bc["nurbs"])
            if res is not None and res[0].shape[1] == 2:
                uv, closed = res
                nx, ny, _ = frame(surf["normal"], surf["x_axis"])
                poly = np.array(surf["pvec"], float) + uv[:, :1] * nx + uv[:, 1:2] * ny
                return sub_polyline(poly, closed, A, B, natural, full)
        return [A] if A is not None else []
    if name == "B_CURVE":
        res = nurbs_polyline(m, c["nurbs"])
        if res is None or res[0].shape[1] != 3:
            return [A] if A is not None else []
        poly, closed = res
        return sub_polyline(poly, closed, A, B, natural, full)
    return [A] if A is not None else []


# ---------- döngüler ----------

def vertex_point(m, vidx):
    v = m.vals(vidx)
    if not v:
        return None
    p = m.vals(v["point"])
    return np.array(p["pvec"], float) if p else None


def loop_points(m, loop_idx):
    lp = m.vals(loop_idx)
    start = lp["fin"]
    pts = []
    f = start
    guard = 0
    while True:
        fin = m.vals(f)
        if fin is None:
            break
        edge = m.vals(fin["edge"])
        end = vertex_point(m, fin["vertex"])
        back = m.vals(fin["backward"]) if fin["backward"] else None
        beg = vertex_point(m, back["vertex"]) if back else None
        if edge is None:
            if end is not None:
                pts.append(end)
        else:
            cidx = edge["curve"] or fin.get("curve")
            csense = (m.vals(cidx) or {}).get("sense", "+")
            natural = (csense == "+") == (fin["sense"] == "+")
            single = fin["forward"] == f
            full = single or beg is None or end is None
            A = beg if beg is not None else end
            pts += curve_points(m, cidx, A, end, natural, full)
        f = fin["forward"]
        guard += 1
        if f == start or not f or guard > 100000:
            break
    # ardışık yinelenenleri at
    out = []
    for p in pts:
        if p is None:
            continue
        if not out or np.linalg.norm(p - out[-1]) > 1e-9:
            out.append(np.asarray(p, float))
    if len(out) > 1 and np.linalg.norm(out[0] - out[-1]) < 1e-9:
        out.pop()
    return out


# ---------- üçgenleme ----------

def area2(p):
    x, y = p[:, 0], p[:, 1]
    return float((x * np.roll(y, -1) - np.roll(x, -1) * y).sum())


def seg_intersect(p1, p2, q1, q2):
    def orient(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    d1 = orient(q1, q2, p1)
    d2 = orient(q1, q2, p2)
    d3 = orient(p1, p2, q1)
    d4 = orient(p1, p2, q2)
    return (d1 * d2 < 0) and (d3 * d4 < 0)


def bridge_holes(outer, holes):
    """Delikleri dış çokgene köprüle (dış CCW, delikler CW). Dizin listesi döner."""
    poly = list(outer)
    holes = sorted(holes, key=lambda h: -max(p[0] for p in h[1]))
    for hidx, hpts in holes:
        hp = np.array(hpts)
        j = int(np.argmax(hp[:, 0]))
        M = hp[j]
        P = np.array([pts for _, pts in poly])
        # en yakın görünür dış nokta
        order = np.argsort(((P - M) ** 2).sum(1))
        edges = [(poly[i][1], poly[(i + 1) % len(poly)][1]) for i in range(len(poly))]
        for _, other in holes:
            pass
        chosen = None
        for i in order[:200]:
            cand = P[i]
            ok = True
            for a, b in edges:
                if seg_intersect(M, cand, a, b):
                    ok = False
                    break
            if ok:
                chosen = int(i)
                break
        if chosen is None:
            chosen = int(order[0])
        hring = [(hidx[k], hpts[k]) for k in range(j, len(hpts))] + [(hidx[k], hpts[k]) for k in range(0, j + 1)]
        poly = poly[: chosen + 1] + hring + poly[chosen:]
    return poly


def earclip(poly):
    """poly: [(index, (x,y))] CCW basit (köprü kopyaları olabilir). Üçgen dizinleri."""
    n = len(poly)
    P = np.array([p for _, p in poly], float)
    ids = [i for i, _ in poly]
    nxt = list(range(1, n)) + [0]
    prv = [n - 1] + list(range(n - 1))
    alive = np.ones(n, bool)
    tris = []
    remaining = n
    i = 0
    fails = 0
    eps = 1e-14
    while remaining > 3:
        a, b, c = prv[i], i, nxt[i]
        pa, pb, pc = P[a], P[b], P[c]
        cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])
        is_ear = False
        if cross > eps:
            mask = alive.copy()
            mask[[a, b, c]] = False
            Q = P[mask]
            if len(Q):
                # aynı konumdaki (köprü) noktaları sayma
                same = (np.abs(Q - pa).sum(1) < 1e-12) | (np.abs(Q - pb).sum(1) < 1e-12) | (np.abs(Q - pc).sum(1) < 1e-12)
                Q = Q[~same]
            if len(Q) == 0:
                is_ear = True
            else:
                v0, v1 = pc - pa, pb - pa
                v2 = Q - pa
                d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1
                d20, d21 = v2 @ v0, v2 @ v1
                den = d00 * d11 - d01 * d01
                if abs(den) < 1e-30:
                    is_ear = False
                else:
                    u = (d11 * d20 - d01 * d21) / den
                    v = (d00 * d21 - d01 * d20) / den
                    inside = (u >= -1e-12) & (v >= -1e-12) & (u + v <= 1 + 1e-12)
                    is_ear = not inside.any()
        if is_ear or fails > remaining * 2:
            if cross > -eps or fails > remaining * 2:
                tris.append((ids[a], ids[b], ids[c]))
            alive[b] = False
            nxt[a], prv[c] = c, a
            remaining -= 1
            i = c
            fails = 0
        else:
            i = nxt[i]
            fails += 1
    if remaining == 3:
        a = i
        tris.append((ids[prv[a]], ids[a], ids[nxt[a]]))
    return tris


def planar_faces(nodes):
    """Tüm düz yüzeyler → (köşeler Nx3, normaller Nx3, üçgenler Mx3), istatistik."""
    m = Model(nodes)
    V, Nn, T = [], [], []
    stats = {"faces": 0, "planar": 0, "failed": 0}
    for idx, (t, name, f) in nodes.items():
        if name != "FACE":
            continue
        stats["faces"] += 1
        if m.name(f["surface"]) != "PLANE":
            continue
        stats["planar"] += 1
        pl = m.vals(f["surface"])
        nx, ny, nz = frame(pl["normal"], pl["x_axis"])
        flip = (f["sense"] == "+") != (pl.get("sense", "+") == "+")
        normal = -nz if flip else nz
        rings = []
        li = f["loop"]
        guard = 0
        while li and guard < 10000:
            pts = loop_points(m, li)
            if len(pts) >= 3:
                rings.append(np.array(pts))
            li = m.vals(li)["next"]
            guard += 1
        if not rings:
            stats["failed"] += 1
            continue
        try:
            base = len(V)
            all3 = []
            rings2 = []
            for r in rings:
                uv = np.c_[r @ nx, r @ ny]
                ids = list(range(len(all3), len(all3) + len(r)))
                all3 += list(r)
                rings2.append((ids, uv))
            areas = [area2(uv) for _, uv in rings2]
            k = int(np.argmax(np.abs(areas)))
            outer_ids, outer_uv = rings2[k]
            if areas[k] < 0:
                outer_ids, outer_uv = outer_ids[::-1], outer_uv[::-1]
            holes = []
            for j, (ids, uv) in enumerate(rings2):
                if j == k:
                    continue
                if areas[j] > 0:
                    ids, uv = ids[::-1], uv[::-1]
                holes.append((ids, [tuple(p) for p in uv]))
            poly = bridge_holes([(i, tuple(p)) for i, p in zip(outer_ids, outer_uv)], holes)
            tris = earclip(poly)
            all3 = np.array(all3)
            V += list(all3)
            Nn += [normal] * len(all3)
            for a, b, c in tris:
                # uv düzleminde CCW → nz yönünde; yüz normali tersse sarımı çevir
                T.append((base + a, base + c, base + b) if flip else (base + a, base + b, base + c))
        except Exception:
            stats["failed"] += 1
    return np.array(V, float), np.array(Nn, float), np.array(T, np.int64).reshape(-1, 3), stats
