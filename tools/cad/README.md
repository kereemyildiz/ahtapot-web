# SolidWorks → web modeli (SB-9K)

Simülatördeki gerçek 3B model (`public/models/sb9k.glb` + `sb9k.anchors.json`)
ürünün SolidWorks montajından bu klasördeki araçlarla üretilir. SolidWorks
gerekmez. CAD dosyaları repo'ya girmez (`Su Isıtıcı SB-9K/`, `.git/info/exclude`).

## Yeniden üretmek

```bash
# 1) Montajı GLB'ye çevir (ham, ~6 MB) + çapalar
python -I tools/cad/build_sb9k.py "Su Isıtıcı SB-9K/Prod V4" /tmp/sb9k-raw.glb
# 2) Sıkıştır: nicemleme + meshopt + %50 sadeleştirme (sapma ≤ %0,1); adlar ve extras korunur
npx -y gltfpack@0.25.0 -i /tmp/sb9k-raw.glb -o public/models/sb9k.glb -kn -km -ke -cc -si 0.5 -se 0.001
cp /tmp/sb9k-raw.anchors.json public/models/sb9k.anchors.json
```

Renkler, katmanlar ve "İçini gösterin" hareketleri burada değil, ürün
verisinde: `content/products/su-banyosu.json` → `assets.simulator.model3d.parts`.
Renk değiştirmek için modeli yeniden üretmek gerekmez.

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
