"""Parasolid silindir ve koni yüzeylerinin üçgen ağı (parametre uzayında).

Yüzey (θ, h) düzlemine açılır: θ eksen etrafındaki açı, h eksen boyunca
uzaklık. Döngü noktaları açılıp θ sarmalanır (unwrap):
- iki tam çember (delik çeperi) → iki halka aynı θ adımlarıyla dikilir;
- dikdörtgene yakın tek döngü (büküm) → düzenli şerit;
- diğer → (θ·r, h) uzayında kulak kırpma.
Sonra noktalar yüzeye geri sarılır, normaller analitik hesaplanır.
"""
import math

import numpy as np

import importlib.util
import os

BASE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("xtmesh", os.path.join(BASE, "xtmesh.py"))
xm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(xm)

TWO_PI = 2 * math.pi
SEG = 64  # tam tur başına örnek


class Surf:
    def __init__(self, name, s):
        self.name = name
        self.P = np.array(s["pvec"], float)
        self.A = np.array(s["axis"], float)
        self.X = np.array(s["x_axis"], float)
        self.Y = np.cross(self.A, self.X)
        self.r = s["radius"]
        self.k = (s["sin_half_angle"] / s["cos_half_angle"]) if name == "CONE" else 0.0

    def to_param(self, pts):
        v = pts - self.P
        th = np.arctan2(v @ self.Y, v @ self.X)
        h = v @ self.A
        return th, h

    def radius(self, h):
        return self.r + self.k * h

    def point(self, th, h):
        rr = self.radius(h)
        return self.P + rr[:, None] * (np.cos(th)[:, None] * self.X + np.sin(th)[:, None] * self.Y) + h[:, None] * self.A

    def normal(self, th, h):
        radial = np.cos(th)[:, None] * self.X + np.sin(th)[:, None] * self.Y
        n = radial - self.k * self.A  # koni: eğim kadar eksene doğru
        return n / np.linalg.norm(n, axis=1, keepdims=True)

    def distance(self, pts):
        th, h = self.to_param(pts)
        v = pts - self.P
        radial = np.linalg.norm(v - np.outer(h, self.A), axis=1)
        return np.abs(radial - self.radius(h))


def _strip(surf, th0, th1, h0, h1):
    n = max(2, int(math.ceil(abs(th1 - th0) / TWO_PI * SEG)) + 1)
    th = np.linspace(th0, th1, n)
    TH = np.r_[th, th]
    H = np.r_[np.full(n, h0), np.full(n, h1)]
    tris = []
    for i in range(n - 1):
        a, b, c, d = i, i + 1, n + i, n + i + 1
        tris += [(a, b, d), (a, d, c)]
    return TH, H, tris


def face_mesh(m, f, surf):
    rings = []
    li = f["loop"]
    while li:
        pts = xm.loop_points(m, li)
        if len(pts) >= 2:
            rings.append(np.array(pts))
        li = m.vals(li)["next"]
    if not rings:
        return None
    params = []
    for r in rings:
        th, h = surf.to_param(r)
        th = np.unwrap(th)
        params.append((th, h))
    spans = [th.max() - th.min() for th, _ in params]
    if len(params) == 2 and all(s > TWO_PI * 0.9 for s in spans):
        # Delik çeperi: iki tam çember arasında bant.
        (t0, h0), (t1, h1) = params
        hA, hB = float(np.median(h0)), float(np.median(h1))
        TH, H, tris = _strip(surf, 0.0, TWO_PI, hA, hB)
    elif len(params) == 1:
        th, h = params[0]
        tmin, tmax, hmin, hmax = th.min(), th.max(), h.min(), h.max()
        uv = np.c_[th * surf.r, h]
        poly_area = abs(xm.area2(uv)) / 2
        box = (tmax - tmin) * surf.r * (hmax - hmin)
        if box > 0 and poly_area / box > 0.97:
            TH, H, tris = _strip(surf, tmin, tmax, hmin, hmax)
        else:
            if xm.area2(uv) < 0:
                th, h, uv = th[::-1], h[::-1], uv[::-1]
            tris = xm.triangulate(uv, [])
            TH, H = th, h
    else:
        return None
    V = surf.point(np.asarray(TH), np.asarray(H))
    N = surf.normal(np.asarray(TH), np.asarray(H))
    T = np.array(tris, np.int64).reshape(-1, 3)
    # Yüz yönü: face.sense ve surface.sense; dışa bakan normal
    flip = (f["sense"] == "+") != (m.vals(f["surface"]).get("sense", "+") == "+")
    if flip:
        N = -N
    # Sarımı normale uydur
    if len(T):
        e = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
        bad = (e * N[T[:, 0]]).sum(1) < 0
        T[bad] = T[bad][:, [0, 2, 1]]
    return V, N, T


def curved_faces(nodes):
    m = xm.Model(nodes)
    V, N, T = [], [], []
    surfaces = []
    stats = {"cyl_cone": 0, "failed": 0, "other": 0}
    for idx, (t, name, f) in nodes.items():
        if name != "FACE":
            continue
        sname = m.name(f["surface"])
        if sname in ("CYLINDER", "CONE"):
            stats["cyl_cone"] += 1
            surf = Surf(sname, m.vals(f["surface"]))
            surfaces.append(surf)
            try:
                res = face_mesh(m, f, surf)
            except Exception:
                res = None
            if res is None:
                stats["failed"] += 1
                continue
            v, n, tr = res
            base = sum(len(x) for x in V)
            V.append(v)
            N.append(n)
            T.append(tr + base)
        elif sname != "PLANE":
            stats["other"] += 1
    if V:
        return np.vstack(V), np.vstack(N), np.vstack(T), surfaces, stats
    return np.zeros((0, 3)), np.zeros((0, 3)), np.zeros((0, 3), np.int64), surfaces, stats


def planes_of(nodes):
    m = xm.Model(nodes)
    out = []
    for idx, (t, name, f) in nodes.items():
        if name == "PLANE":
            out.append((np.array(f["pvec"], float), np.array(f["normal"], float)))
    return out
