# Mock veri takip listesi

Bu dosya, kullanıcının sağlamadığı ama sitenin ihtiyaç duyduğu her şey için
kullanılan mock/placeholder verileri listeler (2026-08-25 talimatı: "ihtiyacın
olan her şeyi mock verilerle hallet, ama not al"). Gerçek veri geldikçe
buradan silinip ilgili dosyada yerine konmalı.

## Doğrulanmış gerçek veriler (referans, TODO değil)

Aşağıdakiler kullanıcıdan geldi, gerçek — mock değil:

- **Şirket hikâyesi:** Kurucu doktor, aynı zamanda yazılım/elektronik/mekanikten
  anlıyor, teknik işe bizzat giriyor. Ekip, kurucunun mühendis arkadaşlarından
  oluşuyor. **"4 kişilik ekip" / "Dördümüz" yanlıştı, kaldırıldı.**
  (`CLAUDE.md`, `content/tr.json` → `hero.heading`, `content/en.json` → aynı)
- **Şirket adresi:** Ahmet Yesevi Mah. Kerem Sok. A Blok No:9 İç Kapı No:404,
  34903 Pendik/İstanbul (`content/tr.json` ve `en.json` → `company.address`,
  `ContactSection.tsx`'te render ediliyor)
- **Logo:** `public/logo.jpg` — `public/logo-mark.png` (arka planı silinmiş
  hali, JPG kaynaklı, kenarlarda hafif halo var — gerçek vektör/AI dosyası
  gelirse değiştirilmeli) sol rail'in üstünde ve `src/app/icon.png`
  (favicon) olarak kullanılıyor.
- **AhtaPatoloji (dijital patoloji ürünü) ekran görüntüleri:**
  `public/products/dijital-patoloji/{annotasyon,karsilastirma,galeri}.png`
  — gerçek uygulama arayüzü. `annotasyon.png` şu an LayersSection'ın
  UYGULAMA katmanında kullanılıyor; `karsilastirma.png` ve `galeri.png`
  henüz hiçbir yerde kullanılmıyor (ileride Ürünler bölümü veya vaka
  çalışması için değerlendirilebilir).
- **Örnek whole-slide image:** `D:\aky-personal\svs-viewer\sample_data\
  PrimaryTumor_HE_009.svs` (gerçek H&E slaytı, openslide ile okundu:
  53248×65536 px, native 41.22×, 0.242591 µm/px). Bu dosyadan native
  çözünürlükte 6144×6144 px'lik gerçek bir doku kırpıntısı alındı (dolu
  slaytın tamamı değil — 872 karolu DZI piramidi ~17MB, tüm slaytı DZI'ye
  çevirmek onbinlerce karo/1GB+ ederdi, pratik değildi). Çıktı:
  `public/deepzoom/primary-tumor-he-009.dzi` +
  `public/deepzoom/primary-tumor-he-009_files/`. `nativeObjective`/
  `nativeMpp` değerleri gerçek metadata'dan (`content/products/
  dijital-patoloji.json`).

## Mimari not (mock değil, karar kaydı)

**Turntable/DeepZoom artık sayfa scroll'una bağlı değil.** İlk sürüm
ScrollTrigger scrub kullanıyordu (sayfayı kaydırınca dönüyor/yakınlaşıyordu)
— bu hem sayfanın kendi scroll'uyla çakışıyordu hem de "görsele
odaklanınca hiçbir şey olmuyor" şikayetine yol açtı. Artık ikisi de kendi
üzerine gelip tekerlek çevirince/sürükleyince tepki veriyor (deepzoom için
OpenSeadragon'un kendi native mouseNavEnabled'ı, turntable için elle
yazılmış pointer-drag + wheel handler), sayfa scroll'una hiç dokunmuyor.
Ayrıca "fancy" etkileşim artık ana sayfada değil, `/urunler/[slug]` detay
sayfasında — ana sayfadaki kart sakin bir statik önizleme.

## Mock veriler — gerçeğiyle değiştirilmeli

### Turntable kare seti (su banyosu)
`public/products/su-banyosu/turntable/frame-01..36.jpg` — **gerçek ürün
fotoğrafı değil**, kod ile üretilmiş soyut/düz "dönen kutu" illüstrasyonu
(marka renkleriyle, fotogerçekçi olmaya çalışmıyor — bilinçli, sahte fotoya
göre daha dürüst). Gerçek su banyosunun 360° çekilmiş 36 karesi gelince
`content/products/su-banyosu.json` → `assets.turntable.framesPath` aynı
kalabilir, dosyalar yer değiştirir; `Turntable.tsx`'te kod değişikliği
gerekmez.

### Ekip (Team bölümü) — dolduruldu, MOCK
`TeamSection.tsx` artık 4 rol kartı gösteriyor (`content/tr.json` →
`team.roles`): "Kurucu — hekim, ürün geliştirme", "Mekanik mühendisi",
"Elektronik mühendisi", "Yazılım mühendisi". **İsim yok, gerçek fotoğraf
yok** — avatar bilinçli olarak sahte bir fotoğraf gibi durmayan düz bir
harf-kutusu (rolün ilk harfi). "4 kişi" sayısı bir iddia olarak yazılmadı
(metinde geçmiyor), yalnız kaç kart gösterildiği kadar — gerçek isim/rol/
fotoğraf geldiğinde `team.roles` gerçek isimlerle, avatar kutuları gerçek
fotoğrafla değiştirilmeli.

### Hakkımızda — dolduruldu, GERÇEK çerçeve
`AboutSection.tsx`'teki paragraf (`content/tr.json` → `about.paragraph`)
kullanıcının verdiği gerçek bilgilerden yazıldı (kurucu hekim + teknik,
ekip mühendis arkadaşları, Ankara, yeni kuruldu) — **mock değil**, ama
uydurma bir "kuruluş hikâyesi" (ör. "bir ihtiyaçtan doğdu" gibi) EKLENMEDİ,
yalnız doğrulanmış gerçekler var.

### Ürün detay sayfası açıklama + özellikler — MOCK
`content/tr.json`/`en.json` → `products.<slug>.description` ve `.features`
— `/urunler/[slug]` sayfasında gösteriliyor. **Gerçek spesifikasyon değil**:
su banyosu için nitel özellikler (dijital sıcaklık kontrolü, paslanmaz
gövde vb.) — kasıtlı olarak kesin sayı/tolerans YAZILMADI (ör. "±0.1°C"
gibi bir değer uydurmak CLAUDE.md'nin mevzuat kuralına aykırı olurdu).
Dijital patoloji için özellikler gerçek ekran görüntülerinden gözlemlenen
işlevlere dayanıyor (annotasyon araçları, karşılaştırma görünümü, vaka
listesi) — bunlar da mock ama en azından gerçek arayüzden gözlemlendi.
Gerçek spesifikasyon/özellik listesi geldiğinde bu iki alan değiştirilmeli.

### Kariyer — dolduruldu
"Şu an açık pozisyonumuz yok, büyüdükçe duyururuz" mesajı + iletişime
yönlendirme. Gerçek açık pozisyon olduğunda `content/tr.json`/`en.json` →
`career.message` değişmeli, gerekirse gerçek bir pozisyon listesi
eklenmeli.

### Referanslar
Gerçek referans verilmedi — bölüm bilinçli olarak hiç render edilmiyor
(`src/app/[locale]/page.tsx` → `references: []`).

### Sertifikalar
CE / ISO 13485 / TİTCK-ÜTS — hiçbiri kullanılmadı (ne gerçek ne mock;
belge numarasız sertifika kullanma kuralı gereği hiç yazılmadı).

### İletişim formu
Yalnız iskelet + gerçek adres var. Form alanları, KVKK checkbox, Resend
entegrasyonu (`RESEND_API_KEY` env var gerekecek) kurulmadı.

### Ürün galerisi görselleri
`content/products/su-banyosu.json` ve `dijital-patoloji.json` →
`assets.gallery: []` — ikisi de boş (gallery artık birincil etkileşim
değil, turntable/deepzoom kullanılıyor, ama yedek/ek görsel yok).

### Katman görselleri (MEKANİK / ELEKTRONİK / GÖMÜLÜ / SAHA)
Yalnız UYGULAMA'nın gerçek görseli var (yukarıda). Diğer 4 katman hâlâ
yalnız cümle — bilinçli olarak mock görsel de eklenmedi bu round'da
(kapsam turntable/deepzoom/ürün grid'iydi). İstenirse bir sonraki round'da
soyut illüstrasyon (turntable kareleriyle aynı stil) ya da gerçek fotoğraf
eklenebilir.
