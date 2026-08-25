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

## Mock veriler — gerçeğiyle değiştirilmeli

### Turntable kare seti (su banyosu)
`public/products/su-banyosu/turntable/frame-01..36.jpg` — **gerçek ürün
fotoğrafı değil**, kod ile üretilmiş soyut/düz "dönen kutu" illüstrasyonu
(marka renkleriyle, fotogerçekçi olmaya çalışmıyor — bilinçli, sahte fotoya
göre daha dürüst). Gerçek su banyosunun 360° çekilmiş 36 karesi gelince
`content/products/su-banyosu.json` → `assets.turntable.framesPath` aynı
kalabilir, dosyalar yer değiştirir; `Turntable.tsx`'te kod değişikliği
gerekmez.

### Ekip (Team bölümü)
Henüz hiç kurulmadı — isim, rol, fotoğraf yok. Kurucunun (doktor) ve
mühendis arkadaşlarının gerçek isimleri/rolleri/fotoğrafları geldiğinde
`TeamSection.tsx` yazılacak.

### Hakkımızda
Şirket hikâyesi metni hâlâ yazılmadı (yalnız üstteki kısa doktor-kurucu
notu Hero'da var). `AboutSection.tsx` boş kabuk.

### Kariyer
İçerik yok — açık pozisyon var mı belirtilmedi. `CareerSection.tsx` boş
kabuk.

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
