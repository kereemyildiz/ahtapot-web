# Ahtapot Tıbbi Teknolojiler — kurumsal site tasarımı

Durum: onaylandı (2026-08-22). Bu doküman brainstorming diyaloğunun sonucudur; kod
öncesi tasarım kararlarını kayıt altına alır. Kaynak brief: `CLAUDE.md`.

## 1. Meander çizgisinin anatomisi

Logo iki ayna-simetrik gövde (elmastan inen iki dikey hat, her biri iki yığılı
anahtar-motifiyle kırılıyor) — literal tek bir çizgi değil. Site bunu **yeniden
yorumluyor**: gövde + anahtar-adımı modülünü logodan türetip tek bir sürekli path'e
zincirliyor. Bu yeniden yorum bilinçli ve dürüst — logoyu birebir izlemiyoruz.

**Modül ("kink")**: gövdeden dik açıyla çık → iç içe iki kademeli spiral adım çiz →
gövdeye dön → düz devam. Kural: **bir kink = bir katman girişi**, her zaman sağa
(içeriğe) kırılıyor, katman etiketine kadar uzanıp geri çekiliyor — dekor değil,
işaretçi.

**Renk = ilerleme**: çizilmiş kısım `--color-ahtapot`, çizilmemiş kısım
`--color-periwinkle` (logonun kendi gradient yönü: üst açık → alt koyu). Aktif
kink/tick'in ucunda tek bir `--color-eosin` nokta — CLAUDE.md'nin eosin için
izin verdiği "aktif/seçili durum" kuralıyla birebir örtüşüyor.

**İki kelime dağarcığı** (aynı SVG sistemi, iki gramer):

| | KINK | TICK |
|---|---|---|
| Nerede | yalnız KATMANLAR, 5 adet, sabit | ÜRÜNLER / HAKKIMIZDA / EKİP / KARİYER / İLETİŞİM, 1'er adet |
| Hareket | tam spiral modül (yukarıda) | tek dik köşe, spiral yok — kısa bir "L" |
| Yatay atış | ~40–56px, etikete uzanır | ~8–12px, kısa çentik |
| Anlamı | büyük anlatı durağı | sayfa konumu / wayfinding |

REFERANSLAR render edilmezse onun tick'i de oluşmaz — rail'deki tick sayısı içerik
kadar veri-güdümlü. İletişim tick'inden hemen sonra adsız, küçük bir **terminus**
ile çizgi kapanır (elmasa dönmüyor — bkz. §self-critique, tek güçlü an ilkesi).

Elmas yalnız hero'da (rail'in başlangıç noktası) bir kez kullanılıyor.

DrawSVG: tek `<path>`, `stroke-dasharray/offset`, ScrollTrigger `scrub: true`.
Reduced motion'da path tam çizili, statik.

## 2. Bölüm akışı

```
HERO → KATMANLAR (5 kompakt beat: MEKANİK/ELEKTRONİK/GÖMÜLÜ/UYGULAMA/SAHA,
       her biri ~40vh desktop, ürünler en geç 3. ekranda başlar)
     → ÜRÜNLER → HAKKIMIZDA → EKİP → REFERANSLAR (veri varsa) → KARİYER → İLETİŞİM
```

Sol rail desktop'ta kalıcı (sabit ~104px kolon), mobilde ince üst progress bar'a
iner (kink/tick ayrımı yalnız desktop rail'in konusu).

## 3. Ürünler grid kuralı

**Her zaman 2 eşit kolon.** Kart sayısı pariteyi belirlemiyor:

- Ürünler sırayla 2'şerli gruplanır (pair).
- Tek kalan (çift olmayan) ürün **kendi kolon genişliğini korur**; yanındaki hücre
  boş kalır (hairline çerçeveli negatif alan) — veri varsa (`products.closingNote`)
  kapanış cümlesi taşır, yoksa sade boş kalır.
- Bir ürünü öne çıkarmak `Product.featured: boolean` alanından gelir — dizi
  parity'sinden değil. `featured: true` bir ürün kendi satırında tam genişlik alır.

Şu an 2 ürün var → tek satır, 2 eşit kolon (turntable/deepzoom simetrisi burada
kurulur). `featured` ve orphan/closingNote yolları kodda doğru ama şu an fiilen
tetiklenmiyor (3. gerçek ürün gelmeden test edilemez, uydurma ürünle
doldurulmadı).

## 4. Kart → katman bağlantısı

Her ürün kartında başlığın altında ana rail'in küçültülmüş yatay kopyası: 4
mini-kink (mekanik · elektronik · gömülü · uygulama — `saha` layer tipinde yok).
Ürünün `layers` alanındaki katmanlar dolu, dışındakiler soluk hairline. Aynı SVG
modülü (`kinkPath`), farklı ölçek — jenerik ikon/etiket listesi değil.

## 5. Tipografi ölçeği

| Rol | Font | Mobil | Desktop | Ağırlık | Tracking |
|---|---|---|---|---|---|
| Hero H1 | Archivo (wdth ekseni) | 40px/1.08 | **64px**/1.06 | 600, wdth~125 (yalnız hero) | -0.01em/-0.015em |
| Bölüm H2 | Archivo | 28px/1.15 | 48px/1.08 | 600, wdth 100 | -0.01em |
| Kart H3 | Archivo | 20px/1.2 | 24px/1.2 | 600, wdth 100 | 0 |
| Lead | Manrope | 18px/1.5 | 22px/1.5 | 500 | 0 |
| Gövde | Manrope | 16px/1.6 | 17px/1.65 | 400 | 0 |
| Buton | Manrope | 15px/1 | 15px/1 | 600 | 0.01em |
| Küçük/caption | Manrope | 13px/1.4 | 13px/1.4 | 500 | 0 |
| Rail etiket | JetBrains Mono | 13px/1.2 | 13px/1.2 | 600 UPPERCASE | 0.06em |
| Eyebrow | JetBrains Mono | 12px/1 | 12px/1 | 500 UPPERCASE | 0.08em |
| Teknik veri | JetBrains Mono | 15px/1.3 | 15px/1.3 | 500 tabular-nums | 0 |
| Form etiketi | JetBrains Mono | **13px**/1.2 | 13px/1.2 | 500 UPPERCASE | 0.04em |

Archivo `wdth` ekseni Google Fonts kaynağında 62–125 aralığında (default 100) —
`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`'dan
doğrulandı. Hero yalnızca burada ~125 (genişletilmiş) kullanıyor.

Uppercase + Türkçe: `text-transform: uppercase` yalnız `lang="tr"` doğru set
edilmişse i→İ dönüşümünü doğru yapıyor (test edildi, ekran görüntüsüyle
kanıtlandı — `lang` yoksa veya `en` ise İLETİŞİM yerine ILETIŞIM çıkıyor). Bu
yüzden içerik dosyalarında metin normal case tutuluyor, uppercase her zaman CSS
ile ve doğru `lang` altında uygulanıyor — asla JSON içine büyük harf yazılmıyor.

## 6. Hero kararı

88px yerine 64px seçildi (metin kesilmedi): CLAUDE.md'nin onaylı örnek cümlesi
("...aynı odada yapıyoruz. Dördümüz.") uzun iddia + tek kelimelik gerçeklik
darbesi yapısını taşıyor, 6-7 kelimeye sıkıştırmak bu yapıyı kırardı. 88px
genişletilmiş Archivo'da bu metin içerik kolonunda (~900-960px) ~5 satır ediyordu;
64px'de ~3-4 satıra iniyor.

Hero CTA tek ve birincil: **"Ürünleri gör"** → `#urunler`. "Teklif iste"/"Demo
talep et" hero'dan kalktı, yalnız Ürünler (ürünün `status`'una göre) ve İletişim
bölümünde kalıyor.

## 7. Katman bölümü — kompakt beat + tipografik fallback

5×100vh yerine 5×~40vh (desktop, mobilde içerik kadar). Beat içi yatay bölünme:
sol ~%35 mono etiket + tek cümle, sağ ~%65 görsel veya tipografik fallback.
Görsel yoksa placeholder kutu/"yakında" yazısı yok — o katmanın gerçek bir
teknik değeri (`stat`/`statLabel`) dev boyutta mono ile gösteriliyor.

**Gereken 5 görsel (kullanıcıdan istendi, henüz TODO):**
1. MEKANİK — su banyosu CAD kesiti veya işlenmiş gövde/parça yakın çekimi
2. ELEKTRONİK — PCB yakın çekimi veya devre/layout görüntüsü
3. GÖMÜLÜ YAZILIM — gerçek firmware kod/debug/logic-analyzer ekran görüntüsü
4. UYGULAMA — dijital patoloji arayüzünün gerçek ekran görüntüsü
5. SAHA — kurulum/teslimat fotoğrafı (insan varsa rıza onaylı)

Ayrıca her katman için gerçek bir `stat`/`statLabel` çifti gerekiyor (görseli
olsa bile yedek olarak). Bu round'da katman içerikleri (`sentence`/`stat`) henüz
yazılmadı — yalnız etiketler var; görsel bölüm yazımı bir sonraki adım.

## Varlık durumu (bu round için)

Ürün görselleri sınırlı — iki ürünün JSON'u da `interaction: "gallery"` ile
kuruldu. `Turntable` ve `DeepZoom` bileşenleri yazıldı ve `interaction` değeri
değiştirilerek devreye girdikleri doğrulandı, sonra `gallery`'ye geri alındı.
`meander.svg` henüz yok — rail'deki path kodda `TODO` ile işaretli geçici bir
türetim (`buildMeanderStroke`), gerçek tasarım dosyasından gelmiyor.
