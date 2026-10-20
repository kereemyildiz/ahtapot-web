# Mock veri takip listesi (tasarım v2)

Gerçek veri geldikçe ilgili dosyada değiştirilip buradan silinmeli.

## Doğrulanmış gerçek veriler (TODO değil)

- **Şirket hikâyesi:** Tıbbi cihaz üreticisi; odak tıbbi cihazları yerlileştirmek. Kurucu hekim; yazılım/elektronik/mekanikten anlıyor, teknik işe bizzat giriyor. Ekip, kurucunun uzun süredir tanıdığı mühendis arkadaşları.
- **Kurucu:** Dr. Mustafa Can Yılmaz (`content/*.json` → `about.founder.name`).
- **Telefon:** +90 535 770 66 49 (`company.phone`; iletişim bölümü ve footer).
- **Adres:** Ahmet Yesevi Mah. Kerem Sok. A Blok No:9 İç Kapı No:404, 34903 Pendik/İstanbul (`content/*.json` → `company.address`).
  Merkez İstanbul (kullanıcı onayladı).
- **Ürün adı:** AhtaPatolog (AhtaPatoloji değil).
- **AhtaPatolog ekran görüntüleri:** `public/products/dijital-patoloji/*.png` (gerçek arayüz; görüntülerin içinde eski "AhtaPatoloji" adı yazıyor, yeni ekran görüntüsü gelince değişmeli).
- **Örnek WSI:** `public/deepzoom/` (gerçek H&E slaytından 6144×6144 kesit, metadata gerçek).
- **Logo:** `public/logo.jpg`.

## Mock / temsili — değiştirilmeli

| Ne | Nerede | Not |
|---|---|---|
| Logo işaretinin vektörü | `src/components/brand/LogoMark.tsx` | PNG'den elle iz sürüldü (tek çizgi, mavi degrade). Resmi SVG/AI gelince path'ler değişmeli. |
| Logo yazısı ve tam logo | `public/brand/wordmark.png`, `public/brand/logo-full.png` | `public/logo.jpg`'den arka planı ayrılarak üretildi. Resmi vektör gelince değişmeli. |
| Kurucunun unvanı | `about.founder.role` | "Kurucu · Tıp Doktoru"; uzmanlık alanı ya da başka bir unvan varsa eklenmeli. |
| Kurucu görseli | `src/components/home/FounderMark.tsx` | Stetoskoptan devreye geçen temsili çizim; gerçek portre gelince yerine konabilir. |
| Su banyosu simülatörü | `content/products/su-banyosu.json` → `assets.simulator.params` | 10 L, 1 kW, kayıp katsayıları, sensör gecikmesi ve hazır ayarlar (37/45/56 °C) **temsili**. Ekranda "temsili simülasyon" notu var. Gerçek değerler gelince yalnız JSON değişir. |
| Su banyosunun zamanlayıcısı | `products/simulator/waterBathPhysics.ts` → `TIMER_STEPS_MIN` | Ürünün gerçekten zamanlayıcısı var mı **onaylanmalı** (pompa özellik listesinde var, zamanlayıcı yok). 30/60/90 dk adımları ve "ayara ulaşınca başlar" davranışı temsili. |
| Su banyosu 3B çizimi | `src/components/device/WaterBathModel.tsx` | Gerçek ürün fotoğrafı değil, oranları temsili; ön panelde Ahtapot logosu. |
| Yetkinlik araç ekranları | `src/components/home/capability/{CadViewport,PcbLayout,FirmwareIde,FieldService}.tsx` | CAD gövdesi, kart yerleşimi, C kodu ve saha sahnesi **temsili**; belirli bir ürünün ölçüsü, devresi, kodu ya da kurulu cihaz parkı değil (her sahnenin altında "örnek/temsili" yazıyor). Gerçek CAD/PCB ekran görüntüleri gelirse onlarla zenginleştirilebilir. |
| Yetkinlik başlıkları ve arayüz etiketleri | `content/*.json` → `capability.items.*.deliverables`, `capability.visuals` | Genel disiplin başlıkları ve araç arayüzü etiketleri; onay bekliyor. |
| Saha hizmet kapsamı | `capability.items.saha` | Kurulum, eğitim, bakım/kalibrasyon ve yazılım güncellemesi; gerçekten verilen hizmetlerle eşleşmeli. |
| Ürün açıklamaları ve özellikler | `content/*.json` → `products.<slug>` | Nitel, sayı/tolerans yok. Gerçek liste gelmeli. |
| Hakkımızda metni ve ilkeler | `content/*.json` → `about` | Yerlileştirme odağıyla kurumsal dilde yazıldı; "yurt dışından tedarik edilen tıbbi cihazların Türkiye'de tasarlanıp üretilmesi", "tasarım, yazılım ve üretim dokümantasyonu bize ait" ve üç ilke onay bekliyor. |
| Hakkımızda olguları | `about.facts` | "Kuruluş yılı" bilinmediği için yazılmadı. |
| E-posta | `company.email` | Boş; boşken sayfada görünmez. |
| Referanslar | — | Gerçek referans yok, bölüm yok. |
| Sertifikalar | — | Hiçbiri yazılmadı (CE / ISO 13485 / ÜTS). |
| Durum etiketi "Piyasada" | `product.statusAvailable` | Su banyosu için `status: available`'dan türüyor; doğru ifade mi onaylanmalı. |
| Dönüş süresi sözü | `contact.promptLine2`, `contact.success.body` | "İki iş günü içinde dönüş" bir taahhüt; ekip bunu karşılayabiliyor mu onaylanmalı. |
| Mikroskop ↔ dijital karşılaştırması | `src/components/products/ScopeCompare.tsx`, `content/products/dijital-patoloji.json` → `assets.compare` | İki taraf da aynı gerçek WSI posterinden; oküler görünümü (daire, büyütme, sıcak ışık) **temsili**. İşaretleme poligonu klinik bir bölgeyi göstermiyor. Ölçek çubuğu gerçek µm/px'ten (`assets.compare.umPerPx`). |
| Görüntüleyicideki örnek işaretlemeler | `src/components/products/DeepZoom.tsx` → `DEMO_POLYGONS`, `DEMO_RULER` | Temsili; ölçümler gerçek µm/px'ten hesaplanıyor ama işaretlenen bölgeler klinik anlam taşımıyor. |
| Hakkımızda metni ve ilkeler (yeniden yazıldı) | `about.lead`, `about.body`, `about.pillars` | Kullanıcı isteğiyle daha akıcı yazıldı; içerik onay bekliyor. |
| Hero modüllerindeki mini çizimler | `src/components/home/HeroNetwork.tsx` → `ModuleArt` | Disiplinlerin temsili çizimleri (açılmış gövde, kart, kontrol yanıtı, işaretleme). |

## Görseller ve atıf

Sitede şu an açık lisanslı fotoğraf yok; atıf zorunluluğu da yok (`content/media.json` → `credits` boş, `/kaynaklar` sayfası ve footer bağlantısı bu yüzden görünmüyor). Gerçek atölye/ekip/ürün fotoğrafları geldiğinde `content/media.json`'a eklenebilir.

## İletişim formu ortam değişkenleri

`RESEND_API_KEY`, `CONTACT_EMAIL_TO`, isteğe bağlı `CONTACT_EMAIL_FROM` — tanımlı değilken form "Şu anda gönderilemedi" mesajı gösterir, çökmez. Cloudflare'de nasıl girileceği: `docs/deploy-cloudflare.md`.
