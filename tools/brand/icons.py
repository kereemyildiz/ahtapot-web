"""Site ikonlarını logonun vektör izinden üretir (components/brand/LogoMark.tsx).

Google arama sonucundaki site ikonu 48'in katı kare ister (48, 96, 144, 192…);
eski icon.png 256 px idi ve sonuçta varsayılan küre görünüyordu. Küçük boyutta
ince çizgi kaybolduğu için çizgi kalınlığı boyuta göre artar.

    pip install pymupdf pillow numpy
    python tools/brand/icons.py

Çıktılar: src/app/icon.png (192), src/app/favicon.ico (16/32/48),
src/app/apple-icon.png (180, beyaz zemin: iOS saydamlığı siyaha çevirir).
"""

import io
import pathlib
import re

import numpy as np
import pymupdf
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = (ROOT / "src/components/brand/LogoMark.tsx").read_text(encoding="utf-8")
PATHS = re.findall(r'"(M[^"]+)"', SRC.split("LOGO_PATHS")[1].split("] as const")[0])
BLUES = dict(re.findall(r'(deep|mid|light): "(#[0-9a-f]{6})"', SRC))

# Logonun çizim kutusu 140,112 → 720,877; kare kadraj, ortalı, kenarda pay.
CX, CY, SIDE = 430, 494.5, 840
PX = 1024


def svg(stroke: float) -> str:
    """Düz siyah çizgi: MuPDF SVG degradesini çizmiyor, degrade render()'da uygulanır."""
    x0, y0 = CX - SIDE / 2, CY - SIDE / 2
    paths = "".join(f'<path d="{d}"/>' for d in PATHS)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {SIDE} {SIDE}" width="{PX}" height="{PX}">'
        f'<g fill="none" stroke="#000" stroke-width="{stroke}" stroke-linecap="square" stroke-linejoin="miter">{paths}</g>'
        "</svg>"
    )


def gradient() -> np.ndarray:
    """LogoMark'taki linearGradient (150,130 → 710,865), aynı duraklar."""
    x0, y0 = CX - SIDE / 2, CY - SIDE / 2
    u = np.linspace(x0, x0 + SIDE, PX)
    v = np.linspace(y0, y0 + SIDE, PX)
    X, Y = np.meshgrid(u, v)
    dx, dy = 710 - 150, 865 - 130
    t = np.clip(((X - 150) * dx + (Y - 130) * dy) / (dx * dx + dy * dy), 0, 1)
    hexrgb = lambda h: [int(h[i : i + 2], 16) for i in (1, 3, 5)]
    stops = [(0, BLUES["deep"]), (0.42, BLUES["mid"]), (0.62, BLUES["light"]), (1, BLUES["deep"])]
    pos = [o for o, _ in stops]
    return np.dstack([np.interp(t, pos, [hexrgb(c)[k] for _, c in stops]) for k in range(3)])


def render(size: int, stroke: float, background=None) -> Image.Image:
    doc = pymupdf.open(stream=svg(stroke).encode(), filetype="svg")
    pix = doc[0].get_pixmap(alpha=True)
    mask = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4)[..., 3]
    rgba = np.dstack([GRADIENT, mask]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA").resize((size, size), Image.LANCZOS)
    if background:
        bg = Image.new("RGBA", img.size, background)
        bg.alpha_composite(img)
        img = bg
    return img


GRADIENT = gradient()
app = ROOT / "src/app"
render(192, 48).save(app / "icon.png", optimize=True)
render(180, 48, "#ffffff").convert("RGB").save(app / "apple-icon.png", optimize=True)
# .ico: her boyut kendi çizgi kalınlığıyla (Pillow append_images ile tek dosya).
ico = [render(48, 62), render(32, 70), render(16, 84)]
ico[0].save(app / "favicon.ico", format="ICO", sizes=[(48, 48), (32, 32), (16, 16)], append_images=ico[1:])
print("icon.png 192, apple-icon.png 180, favicon.ico 48/32/16")
