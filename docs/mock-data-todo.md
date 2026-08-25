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

### Ekip (Team bölümü) — dolduruldu, MOCK (isimler dahil)
`TeamSection.tsx` `content/tr.json`/`en.json` → `team.members` içindeki 4
kaydı render ediyor: **Kaan Aydın** (Kurucu — Hekim), **Efe Demir**
(Mekanik Mühendisi), **Cem Şahin** (Elektronik Mühendisi), **Ada Kaya**
(Yazılım Mühendisi) — her biri bir cümlelik bio ile. **İsimler UYDURMA —
gerçek kişi adları değil** (kurucunun soyadı gerçek isimle karışmasın diye
bilinçli olarak "Yıldız" kullanılmadı). Gerçek fotoğraf da yok — avatar
bilinçli olarak sahte bir fotoğraf gibi durmayan düz bir harf-kutusu
(adın ilk harfi). Gerçek isim/rol/bio/fotoğraf geldiğinde `team.members`
gerçek verilerle, avatar kutuları gerçek fotoğrafla değiştirilmeli.

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

### İletişim formu — kuruldu, GÖNDERİM env değişkenleri EKSİK
`ContactForm.tsx` (client) + `app/api/contact/route.ts` (server) canlı test
edildi: client-side zod validasyonu, server-side zod validasyonu, honeypot
(`hp` doluysa sessizce `{ok:true}`, mail gönderilmez), rate limit (aynı IP
için 10 dakikada 6. istekte `429`) — hepsi gerçek isteklerle doğrulandı.
**Eksik olan gerçek veri, kod değil, ortam değişkenleri:**
- `RESEND_API_KEY` — ayarlanmadı, şu an her gönderim `500 send_failed`
  ile düşüyor (kullanıcıya "Şu anda gönderilemedi" gösteriliyor, çökmüyor).
- `CONTACT_EMAIL_TO` — talep e-postalarının gideceği gerçek kutu adresi
  henüz yok.
- `CONTACT_EMAIL_FROM` (opsiyonel) — verilmezse `onboarding@resend.dev`'e
  düşüyor, Resend hesabında doğrulanmış bir gönderen alanı olduğunda
  gerçek adresle değiştirilmeli.
Bu üçü Vercel proje ayarlarında (ya da yerelde `.env.local`) tanımlanınca
kod tarafında hiçbir değişiklik gerekmiyor.

### Ürün galerisi görselleri
`content/products/su-banyosu.json` ve `dijital-patoloji.json` →
`assets.gallery: []` — ikisi de boş (gallery artık birincil etkileşim
değil, turntable/deepzoom kullanılıyor, ama yedek/ek görsel yok).

### Katman beat'leri (MEKANİK / ELEKTRONİK / GÖMÜLÜ / UYGULAMA / SAHA)
Kullanıcı talebiyle ("burada screenshot kullanmana gerek yok") UYGULAMA
satırındaki AhtaPatoloji ekran görüntüsü kaldırıldı — `LayerBeats.tsx`
artık hiçbir katmanda görsel desteklemiyor (`LayerBeatItem.image` alanı
tamamen silindi), 5 katman da simetrik: mini meander glyph + tek cümle.
`annotasyon.png` hâlâ `public/products/dijital-patoloji/` altında duruyor,
başka hiçbir yerde kullanılmıyor (gerekirse ürün detay sayfasına taşınabilir).
