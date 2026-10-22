# SEO — arama motorunda görünme

## Sitede yapılanlar (kod)

- `/robots.txt` (`src/app/robots.ts`): her şey taranabilir, `/api/` hariç; site haritasını gösterir.
  Önceden canlıda **500** dönüyordu; Google, robots.txt 5xx dönerken siteyi taramaz. Siteyi
  bulamamasının en olası nedeni buydu.
- `/sitemap.xml` (`src/app/sitemap.ts`): ana sayfa, ürün sayfaları, KVKK ve gizlilik; her biri TR ve EN,
  dil karşılıklarıyla.
- Her sayfada canonical ve `hreflang` (tr, en, x-default) — `src/lib/seo.ts` → `pageAlternates`.
- Ana sayfa başlığı: "Ahtapot Tıbbi Teknolojiler · Tıbbi cihaz tasarımı ve üretimi"; açıklama şirketin
  ne yaptığını ve İstanbul'u söylüyor (`content/*.json` → `meta`).
- Paylaşım kartı (WhatsApp, LinkedIn, X): `public/og/tr.png`, `public/og/en.png`.
- Yapılandırılmış veri (ana sayfa): `Organization` (ad, yasal ad, "Ahtapot" diğer adı, logo, adres,
  telefon, e-posta, kurucu) ve `WebSite`. Google'ın marka adını ve logosunu doğru göstermesine yardım eder.
- Bilinmeyen adresler (`/favicon.ico` gibi) artık 500 değil 404.

## Sizin yapmanız gerekenler (Google hesabıyla, bir kez)

Google yeni bir alan adını kendiliğinden geç bulur. Hızlandırmak için:

1. **Google Search Console** → https://search.google.com/search-console → "Mülk ekle" →
   **Alan adı** → `ahtapot.ink`.
2. Doğrulama: Search Console bir DNS TXT kaydı verir. Alan adı Cloudflare'de olduğu için
   Cloudflare paneli → `ahtapot.ink` → DNS → kayıt ekle (TXT, ad `@`, değer Search Console'un verdiği).
   (Search Console bazen "Cloudflare ile doğrula" düğmesi de sunar; tek tıkla aynı işi yapar.)
   Alternatif: HTML etiketi seçilirse içerikteki kodu Cloudflare Workers Builds'te derleme değişkeni
   `GOOGLE_SITE_VERIFICATION` olarak tanımlayın; site `<meta name="google-site-verification">` olarak basar.
3. Doğrulandıktan sonra sol menü → **Site haritaları** → `https://ahtapot.ink/sitemap.xml` → Gönder.
4. **URL denetimi** → `https://ahtapot.ink/tr` → "Dizine eklenmesini iste". Aynısını `/en` için.
5. İsteğe bağlı: **Bing Webmaster Tools** (Search Console'dan içe aktarılabilir).
6. **Google İşletme Profili** (https://business.google.com): şirket adı, Pendik adresi, telefon,
   web sitesi. "Ahtapot Tıbbi" gibi aramalarda ve haritada sağ tarafta görünmeyi sağlar.

## Beklenti

- Dizine girme genelde birkaç gün ile birkaç hafta sürer.
- "ahtapot" tek başına genel bir kelime (hayvan adı, başka işletmeler); bu aramada ilk sırada çıkmak
  kısa vadede gerçekçi değil. "Ahtapot Tıbbi", "Ahtapot Tıbbi Teknolojiler", "AhtaPatolog",
  "SB-9K su banyosu" gibi aramalarda çıkmak gerçekçi hedef.
- Sıralamayı en çok başka sitelerden gelen bağlantılar artırır: LinkedIn şirket sayfası, Teknokent
  firma listesi, distribütör/üniversite sayfaları, haberler. Bunlar sitede `sameAs` olarak da
  eklenebilir (`src/lib/seo.ts`), adresleri verildiğinde.
