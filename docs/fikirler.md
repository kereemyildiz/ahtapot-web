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

## Yapıldı

_(henüz yok)_
