"""Footer'daki rozet logoları: Teknogirişim Rozeti ve Millî Teknoloji Hamlesi.

Kaynak: Sanayi ve Teknoloji Bakanlığı'nın Teknogirişim portalındaki resmî,
saydam PNG'ler (PDF belgesindeki taramadan net). Rozet logosu "Başvuru"
satırı olmadan, Hamle işareti Bakanlık logosunun sağından kırpılır.

Koyu zemin için ikinci sürüm: lacivert ve siyah kısımlar sitenin metin
rengine (ink) döner, kırmızı ve açık mavi kalır (logoların koyu zemin
kullanımındaki gibi). Açık temada orijinal renkler gösterilir.

    pip install pillow
    python tools/brand/badges.py
"""

import io
import pathlib
import urllib.request

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "public/badges"
BASE = "https://teknogirisim.sanayi.gov.tr/Common/Images/"
INK = (0xEE, 0xF0, 0xF6)  # koyu tema --color-ink


def fetch(name: str) -> Image.Image:
    req = urllib.request.Request(BASE + name, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def trim(img: Image.Image, pad: int) -> Image.Image:
    l, t, r, b = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def for_dark(img: Image.Image) -> Image.Image:
    """Koyu (lacivert/siyah) pikselleri ink'e çevirir; kırmızı ve açık tonlar kalır."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
            reddish = r > 150 and r > g + 60
            if lum < 0.32 and not reddish:
                px[x, y] = (*INK, a)
    return out


OUT.mkdir(parents=True, exist_ok=True)
badges = {
    # 750 × 365; alttaki "Başvuru" satırı y ≈ 268'den başlar.
    "teknogirisim-rozeti": trim(fetch("teknogirisimRozet2AltCizili.png").crop((0, 0, 750, 268)), 6),
    # 3042 × 750 (çerçeveli); Hamle işareti sağdaki bölmede.
    "milli-teknoloji-hamlesi": trim(fetch("stb-color-logo.png").crop((2200, 30, 3000, 720)), 8),
}
for name, img in badges.items():
    img.save(OUT / f"{name}.png", optimize=True)
    for_dark(img).save(OUT / f"{name}-koyu.png", optimize=True)
    print(name, img.size)
