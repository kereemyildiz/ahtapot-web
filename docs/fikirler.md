# Fikirler

Aklımıza gelen ama henüz yapılmayan işler. Yeni fikir en alta eklenir; yapılınca
"Yapıldı" bölümüne taşınır (tarih ve commit ile). Sıra öncelik değildir.

## Bekleyenler

### Şirket tanıtım filmi (30–45 sn)
- **Ne:** Yatırımcı sunumu, LinkedIn ve e-posta için kısa MP4. Logo kendini çizer
  → dört disiplin (mekanik, elektronik, gömülü, uygulama) → su banyosu →
  AhtaPatolog → iletişim.
- **Neden:** Yatırımcı her zaman siteyi açmaz; aynı anlatı bir video olarak da
  elinde olsun.
- **Nasıl:** HyperFrames (heygen-com/hyperframes) — HTML + GSAP sahnelerinden
  video üretir. Sitenin logosu, renkleri ve sahneleri doğrudan kullanılabilir.
  Gerekenler: FFmpeg (makinede yok), `claude plugin marketplace add heygen-com/hyperframes`
  ve `claude plugin install hyperframes@hyperframes`.
- **Kurallar:** Sitedeki mevzuat kısıtları videoda da geçerli (tanı/klinik
  performans iddiası yok, AhtaPatolog'da "Geliştirme aşamasında" ibaresi,
  simülasyon temsili notu). Siteye otomatik oynayan hero videosu olarak
  konmaz (LCP bütçesi).
- **Eklendi:** 2026-10-21

### AhtaPatolog demo videosu
- **Ne:** Gerçek ekran görüntülerinden kısa ürün demosu; ürün detay sayfasında
  yalnız tıklanınca oynar, ayrıca "Demo talep edin" e-postalarında kullanılabilir.
- **Nasıl:** Tanıtım filmiyle aynı altyapı (HyperFrames).
- **Eklendi:** 2026-10-21

## Yol haritası (kullanıcının sırası: A → B → C)

**A** — yapıldı (2026-10-21; `develop`: 2d2c780, 82f1177; kullanıcı onayı bekliyor)
- Hakkımızda bölümü daha etkileyici olsun.
- Stetoskop animasyonu yalnız ilk açılışta değil, bölüme her girişte oynasın (hero gibi).
- Hero'daki 4 disiplin modülüne tıklayınca ilgili yetkinlik adımına güzel bir geçişle gidilsin.
- Footer üstündeki büyük logo için beyin fırtınası: kaldır ya da başka bir şeye dönüştür. → Seçenek 2: logo iletişim bilgilerinin başına geçti, kolları satırlara uzanıyor.

**B**
- Su banyosunun SolidWorks çizimi var (asıl ürün): simülatördeki temsili 3B model bununla değiştirilip entegre edilecek.
- Şirket bilgileri verilecek, genel refactor.
- Uygun yerlere ikon.
- Açık tema desteği (şu an CLAUDE.md "tek koyu tema" diyor; bu kural kullanıcı isteğiyle değişecek).
- Metinler ve açıklamalar yeniden düzenlenecek (kullanıcı mevcut hâlini beğenmiyor).


**C**
- Demo videosu (yukarıdaki tanıtım filmi / AhtaPatolog demosu).
- SEO: aramalarda öne çıkma.


## Yapıldı

_(henüz yok)_
