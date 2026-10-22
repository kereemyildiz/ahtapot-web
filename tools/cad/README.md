# SolidWorks → web modeli (SB-9K)

Simülatördeki gerçek 3B model (`public/models/sb9k.glb` + `sb9k.anchors.json`)
ürünün SolidWorks montajından bu klasördeki araçlarla üretilir. SolidWorks
gerekmez. CAD dosyaları repo'ya girmez (`Su Isıtıcı SB-9K/`, `.git/info/exclude`).

## Yeniden üretmek

```bash
# 0) Bir kez: numpy ve earcut (delikli yüzeylerin üçgenlenmesi)
pip install numpy mapbox_earcut==2.1.0
# 1) Montajı GLB'ye çevir (ham, ~3 MB) + çapalar
python -I tools/cad/build_sb9k.py "Su Isıtıcı SB-9K/Prod V4" /tmp/sb9k-raw.glb
# 2) Sıkıştır: konum 12 bit (~0,14 mm), meshopt, %50 sadeleştirme (sapma ≤ %0,1); adlar ve extras korunur
npx -y gltfpack@0.25.0 -i /tmp/sb9k-raw.glb -o public/models/sb9k.glb -kn -km -ke -cc -si 0.5 -se 0.001 -vp 12
cp /tmp/sb9k-raw.anchors.json public/models/sb9k.anchors.json
```

`mapbox_earcut` yoksa kendi kulak kırpmamıza düşer; o, birden çok deliği olan
yüzeylerde ters üçgen üretebiliyor (ön paneldeki iki düğme deliği arasında
"köprü" görünüyordu).

## Web modeli üretim verisi değildir

- Parça adları `WEB_PARTS` tablosuyla nötr kimliklere çevrilir (`govde`, `hazne`,
  `dugme-1`…); dosya adı, revizyon, tedarikçi parça numarası modele girmez.
  Tabloda olmayan parça (vidalar vb.) atılır.
- `PROXY_BOX`: kontrolcünün tedarikçi modeli (iç devreleriyle ~83 bin üçgen)
  yerine sınır kutusu konur; ön yüzü sitede çizilir.
- Konum 12 bit nicemlenir; modelde yalnız iki ortak malzeme vardır (renkler ürün
  verisinde).
- Kenar çizgileri (sınır + 32°'den keskin kenarlar) burada hesaplanır ve her
  parçaya LINES ilkeli olarak gömülür; tarayıcıda `EdgesGeometry` çalışmaz.

Renkler, katmanlar ve "İçini gösterin" hareketleri burada değil, ürün
verisinde: `content/products/su-banyosu.json` → `assets.simulator.model3d.parts`.
Renk değiştirmek için modeli yeniden üretmek gerekmez.

## Poster (yüklenirken görünen görüntü)

`public/models/sb9k-poster.webp`: WebGL modeli yüklenene kadar (~1 sn) onun yerinde
duran, aynı kameradan çizilmiş saydam zeminli görüntü (`device/SB9KPoster.tsx`).
Eskiden bu sürede CSS çizim modeli görünüyordu (kullanıcı: "önce eski model
render'lanıyor"). Model, renkler, ışık ya da kamera (`dist`, `yaw`, `pitch`,
`setViewOffset`) değişince yeniden çekilmeli:

1. `pnpm dev`; Chrome'da sayfayı, WebGL bağlamını `preserveDrawingBuffer: true`
   ile açacak bir başlangıç betiğiyle yükle (`HTMLCanvasElement.prototype.getContext`
   sarmalanır). Görünüm alanı genişliği 560 px'ten dar olmalı (kadraj kaydırması
   yok, merkez = tuval merkezi); ör. 540 px, DPR 3.
2. Simülatöre ~1 ekran kala bekle (görüntüleyici hazır, cihaz kapalı), sonra
   simülatöre kaydır: cihaz kendiliğinden açılır. ~0,6 sn sonra (ekran ~22 °C)
   tuvali 2B tuvale çiz, alfa > 6 olan piksellerin sınır kutusuna kırp,
   `toDataURL("image/webp", 0.9)`.
3. Kutuyu tuval yüksekliği biriminde ve tuval merkezine göre yaz:
   `left = (x0 − W/2)/H`, `top = (y0 − H/2)/H`, `width = w/H`, `height = h/H` →
   ürün verisinde `model3d.poster.box`.
4. Doğrula: görüntüleyiciyi bekletip (`requestIdleCallback` tutulur) posterin,
   sonra modelin ekran görüntüsünü al; ikisi üst üste oturmalı (masaüstü, tablet,
   telefon).

## Nasıl çalışır

SolidWorks 2015+ dosyası ZIP benzeri bir kapsayıcı: bölüm başlığı
`14 00 06 00 08 00`, adlar nibble-döndürülmüş, veri raw deflate (`swdisplay.py`).

| Kaynak | Ne verir |
|---|---|
| `swXmlContents/COMPINSTANCETREE` | Montaj ağacı ve her parçanın 4×4 dönüşümü (satır vektörü) |
| `Contents/Config-0-Partition` | Parasolid B-rep (neutral binary XT, içinde ikinci bir zlib) |
| `Contents/DisplayLists`, montajın `FaceTessellations/*` | SolidWorks'ün ekran için sakladığı üçgen şeritleri (yüzeylerin bir kısmı) |
| `ThirdPtyStore/VisualStates` | Görünüm rengi |

Ekran listeleri düz yüzeylerin çoğunu saklamaz (SolidWorks açılışta Parasolid'den
üretir), bu yüzden:

- **Düz yüzeyler** (`xtmesh.py`): Parasolid'den. Döngüler dolaşılır (FACE → LOOP →
  FIN), kenarlar örneklenir (doğru, çember, elips, NURBS, kırpılmış, yüzey
  üstü eğri), delikler köprülenip kulak kırpma ile üçgenlenir.
- **Silindir ve koni** (`xtcurved.py`): Parasolid'den, (θ, h) düzleminde; delik
  çeperleri iki çember arasında bant, bükümler düzenli şerit.
- **Diğer yüzeyler** (B-yüzeyler) ve Parasolid'i boş satın alınmış parçalar
  (ENDA kontrolcü, IEC girişi, kablo, SSR, güç kaynağı, filtre): ekran
  listelerinden, hangisi daha zenginse.

`xtread.py` XT okuyucusudur: neutral binary (big-endian), gömülü şema
(`SCH_x_y_13006` → V13 tabanına göre C/D/I/A/Z düzenleme dizisi). Taban şema
`xtbase.json`, "Parasolid XT Format Reference" (V12) metninden `xtschema.py`
ile çıkarıldı; V12 ile V13 arasında bulunan fark `xtread.BASE_PATCH`'te.

Teflon hazne grubu (`Teflon_Tepsi_Grubu.SLDASM`) son montajda yok; kurucu onu
alt tepsinin ortasına hizalar ve tabanını ısı transfer plakasının üstüne oturtur
(kılavuz: hazne plakaya tam temas eder).

`*.anchors.json`: kontrolcü ön yüzü (77 × 35 mm), iki ışıklı düğme, haznenin iç
hacmi ve su seviyeleri, logonun yeri, sınır kutusu — dünya koordinatında (m).
