# SEO — arama motorunda görünme

## Durum (22 Ekim 2026)

Google'da yalnız ana sayfa dizinde (`https://ahtapot.ink` adresiyle; kök `/tr`'ye 307 ile yönlendiği
için Google kök adresi gösteriyor, sorun değil). Ürün sayfaları henüz dizinde değildi.

| Arama | Durum | Gerçekçi hedef |
|---|---|---|
| ahtapot tıbbi | 1. sıra | korunur |
| ahtapot medikal | yokuz; Teknopol kaydı çıkıyor | 1. sayfa: açıklamada artık "medikal" geçiyor, İşletme Profili ile güçlenir |
| ahtapot elektronik | yokuz; ASELSAN'ın AHTAPOT sistemi ve tripodlar | zor; marka bilinirliği ve bağlantılarla uzun vadede |
| ahtapot | hayvan, yemek, başka firmalar | kısa vadede gerçekçi değil; marka paneli İşletme Profili ile gelebilir |
| doku yüzdürme su banyosu | distribütörler (Lauda, Biobase…) | 1. sayfa: SB-9K sayfası dizine girince |
| dijital patoloji yazılımı | Virasoft, Roche, Leica… | ürün sayfası başlığında artık bu ifade var; üst sıralar içerik ve bağlantı ister |
| medikal / tıbbi cihaz üretimi, tıbbi cihazlar | dernekler, TİTCK, büyük firmalar + **harita sonuçları** | harita kutusu (İşletme Profili); organik için ayrı içerik sayfası gerekir |

## Sitede yapılanlar (kod)

- `/robots.txt` (`src/app/robots.ts`): her şey taranabilir, `/api/` hariç; site haritasını gösterir.
  Önceden canlıda **500** dönüyordu; Google, robots.txt 5xx dönerken siteyi taramaz.
- `/sitemap.xml` (`src/app/sitemap.ts`): ana sayfa, ürün sayfaları, KVKK ve gizlilik; her biri TR ve EN,
  dil karşılıklarıyla.
- Her sayfada canonical ve `hreflang` (tr, en, x-default) — `src/lib/seo.ts` → `pageAlternates`.
- Ana sayfa başlığı "Ahtapot Tıbbi Teknolojiler · Yerli tıbbi cihaz tasarımı ve üretimi"; açıklamada
  "medikal cihaz" geçer (başlıkta "tıbbi", açıklamada "medikal": iki arama biçimi de karşılanır).
  `content/*.json` → `meta`.
- Ürün sayfalarının arama başlığı ve açıklaması `products.<slug>.metaTitle` / `metaDescription`
  (yoksa ad ve tagline). AhtaPatolog: "AhtaPatolog dijital patoloji yazılımı"; açıklamada
  "Geliştirme aşamasında" yazar (mevzuat: geliştirme durumu gizlenmez).
- Paylaşım kartı (WhatsApp, LinkedIn, X): `public/og/tr.png`, `public/og/en.png`.
- Yapılandırılmış veri:
  - Ana sayfa: `Organization` (ad, yasal ad, diğer adlar, logo, adres, telefon, e-posta, kurucu,
    `areaServed` Türkiye, `knowsAbout` = `meta.knowsAbout`, `sameAs` = `company.sameAs`) ve `WebSite`.
  - Ürün sayfaları: `BreadcrumbList` (arama sonucunda adres yerine "Ahtapot Tıbbi Teknolojiler › Ürün").
  - `Product` şeması bilinçli olarak yok: Google fiyat/teklif alanı ister, satış dili yasak; eksik
    alanlı Product Search Console'da hata olarak görünür.
- `company.sameAs`: şirketi anlatan başka sitelerdeki sayfalar. Şu an Teknopol İstanbul kaydı.
  LinkedIn şirket sayfası vb. açılınca buraya eklenir.
- IndexNow: `public/f18b4e8c71d33e9f1f49f0dd2c0418b0.txt` anahtar dosyası. Yayından sonra
  `node tools/seo/indexnow.mjs` site haritasındaki adresleri Bing, Yandex ve diğerlerine bildirir
  (hesap gerekmez; Google IndexNow kullanmaz).

## Yapay zekâ asistanları (ChatGPT, Gemini, Claude, Perplexity, Copilot)

Asistanlar öneri verirken ya kendi eğitim bilgisinden ya da canlı aramadan yararlanır. Canlı aramada
her biri başka bir dizine bakar: **Gemini** ve Google AI Overviews → Google; **ChatGPT** ve
**Copilot** → Bing; **Claude** → Brave; **Perplexity** → kendi dizini + diğerleri. Bir dizinde yoksak
o asistan bizi bulamaz.

Durum (22 Ekim 2026): Google'da ana sayfa var; **Brave'de hiç yokuz**; Bing'i CAPTCHA yüzünden
kontrol edemedim (Bing Webmaster Tools açılınca oradan görülür).

Sitede yapılanlar:
- `/robots.txt`: yapay zekâ botları (OAI-SearchBot, GPTBot, Claude-SearchBot, ClaudeBot,
  PerplexityBot, Google-Extended, CCBot…) adıyla listelenir ve hepsine izin verilir. Eğitim botlarına
  da izin bilinçli: modelin şirketi aramadan da tanıması için. Cloudflare bu botları engellemiyor
  (22 Ekim'de her biri 200 aldı); Cloudflare panelindeki "AI botlarını engelle" ayarı açılırsa bu bozulur.
- `/llms.txt` (kısa özet + bağlantılar) ve `/llms-full.txt` (sitenin tüm metni, TR + EN):
  `src/lib/llms.ts`, metin tamamen `content/*.json`'dan. İçerik değişince kendiliğinden güncellenir.
  `X-Robots-Tag: noindex`: Google'da sayfa gibi çıkmaz.
- Tüm metin ilk HTML'de (JavaScript gerektirmez); yapılandırılmış veride şirket, kurucu (unvanıyla),
  uzmanlık konuları ve Teknopol kaydı.

Sizin yapacaklarınız (önem sırasıyla):
1. **Bing Webmaster Tools** (yukarıda 3. madde): ChatGPT ve Copilot Bing'den okuyor; en kritik adım.
2. **LinkedIn şirket sayfası** ve düzenli gönderiler: ChatGPT ve Copilot mesleki sorularda LinkedIn'i
   sık kaynak gösteriyor. Şirket açıklaması sitedekiyle aynı olsun.
3. **Tutarlı tanım**: Teknopol, LinkedIn, Google İşletme Profili, Crunchbase vb. her yerde aynı cümle
   ("İstanbul'da tıbbi cihaz tasarlayan ve üreten…"). Asistanlar kaynaklar arası tutarlılığa bakar;
   Teknopol'deki tanım esas sözleşmenin geniş faaliyet konusunu sayıyor; asistanlar şirketi
   "yapay zekâ / robotik firması" sanabilir.
4. **Wikidata kaydı** (https://www.wikidata.org): şirket için bir öğe (ad, kuruluş yeri İstanbul,
   sektör tıbbi cihaz, resmi site, kurucu). Google bilgi paneli ve asistanlar varlık tanımada kullanır.
   Şirket adına beyan olduğu için sizin açmanız gerekir.
5. **Haber ve sektör sayfaları**: Teknopol haberleri, dernek/küme üyelik listeleri, üniversite iş
   birliği duyuruları. "Önerilen firmalar" listesine girmek büyük ölçüde başkalarının hakkınızda
   yazdıklarına bağlı.
6. **Video** (fikir listesindeki tanıtım filmi): YouTube başlığı ve açıklamasında ürün adları ve
   "doku yüzdürme su banyosu" gibi ifadeler; asistanlar videonun yazılı kısmını okur.

Karışma riski: "Ahtapot" adı ASELSAN'ın AHTAPOT sistemi, TÜBİTAK/Pardus'un Ahtapot güvenlik yazılımı ve
Ahtapot Robotik gibi başka işlerle ortak. Bunlarla bağınız yoksa `/llms.txt`'ye bunu söyleyen bir
cümle eklenebilir (onayınızla).

Takip: ayda bir aşağıdaki soruları ChatGPT, Gemini, Claude ve Perplexity'ye 3'er kez sorup
"bahsedildi mi, hangi sayfa kaynak gösterildi" diye not edin (yanıtlar her seferinde değişir; tek
deneme ölçüm değildir):
- "Ahtapot Tıbbi Teknolojiler nedir, ne üretir?"
- "Türkiye'de tıbbi cihaz tasarlayıp üreten yeni şirketler hangileri?"
- "İstanbul'da medikal cihaz geliştirme yaptırabileceğim firma önerir misin?"
- "Yerli doku yüzdürme su banyosu üreticisi var mı?"
- "Türkiye'de geliştirilen dijital patoloji yazılımları hangileri?"

## Site ikonu (arama sonucundaki küçük logo)

Google sonuçta varsayılan küre gösteriyordu. Nedenler: ikon 256 px idi (Google 48'in katı kare ister:
48, 96, 144, 192…) ve `/favicon.ico` 404 dönüyordu. Şimdi `src/app/icon.png` 192 px,
`src/app/favicon.ico` 16/32/48 px, `src/app/apple-icon.png` 180 px; hepsi logonun vektör izinden
`tools/brand/icons.py` ile üretilir (logo değişirse yeniden çalıştırın). Google ikonu ana sayfayı
yeniden taradığında günceller; birkaç gün ile birkaç hafta sürebilir.

## Belgeler ve kurumsal bilgiler

- **Teknogirişim Rozeti** (T.C. Sanayi ve Teknoloji Bakanlığı, 3 Temmuz 2025 tarihli yönetmelik):
  belge no 2026-1713, onay 11.09.2026, 3 yıl geçerli (Eylül 2029). Hakkımızda bölümündeki bilgi
  listesinde rozet logosuyla (`public/badges/teknogirisim-rozeti.png`, kullanıcının belgesinden
  çıkarıldı) ve yapılandırılmış veride `award` olarak. Bir ürün sertifikası değildir; ürünlerin
  yanında kullanılmaz. 2029'da yenilenmezse kaldırılmalı.
- **Teknopol İstanbul**: kuluçka firması, teknokent onaylı Ar-Ge projesi (kullanıcı beyanı; Teknopol
  firma listesi de kuluçka firması diyor).

## Search Console'da yapılanlar

- Alan adı mülkü (`ahtapot.ink`) doğrulanmış (kullanıcı).
- 22 Ekim 2026: site haritası gönderildi (`https://ahtapot.ink/sitemap.xml`). Yeni mülkte ilk
  saatlerde "Getirilemedi" görünmesi olağan; birkaç gün içinde "Başarılı" olmalı. Dosya Googlebot'a
  200 ve geçerli XML dönüyor.
- 22 Ekim 2026: dizine ekleme istendi: `/tr/urunler/su-banyosu`, `/tr/urunler/dijital-patoloji`, `/en`;
  yeni başlıklar yayına girince (PR #5) `/tr`, `/tr/urunler/dijital-patoloji` (zaten dizindeydi, yeniden
  tarama), `/en/urunler/dijital-patoloji`, `/en/urunler/su-banyosu`. Günlük kota ~10 adres.
  Aynı gün site haritası "Başarılı", 10 sayfa keşfedildi.
- Zengin Sonuçlar Testi (22 Ekim): ana sayfada "Kuruluş" ve "Yerel işletmeler" geçerli (tek uyarı
  isteğe bağlı `image`; develop'ta eklendi), ürün sayfasında "İçerik haritaları" geçerli.
- IndexNow (22 Ekim, yayından sonra): 10 adres gönderildi, `202 Accepted`.

## Sizin yapmanız gerekenler

Bunlar hesap açma, kimlik doğrulama veya şirket adına beyan gerektiriyor; Claude yapamaz.

1. **Google İşletme Profili** (https://business.google.com) — genel aramalarda ("medikal cihaz
   üretimi") Google harita kutusu gösteriyor; oraya girmenin tek yolu bu.
   - Ad: `Ahtapot Tıbbi Teknolojiler` (anahtar kelime eklemeyin; Google askıya alır).
   - Kategori: birincil "Tıbbi ekipman üreticisi" (EN arayüzde *Medical equipment manufacturer*);
     ikincil olarak uygun düşerse "Yazılım şirketi".
   - Adres: sitedeki Teknopol adresi. Ziyaretçi kabul etmiyorsanız adresi gizleyip hizmet bölgesi
     "Türkiye" seçin.
   - Telefon `+90 535 770 66 49`, web sitesi `https://ahtapot.ink/tr`, çalışma saatleri.
   - Açıklama önerisi: "Ahtapot Tıbbi Teknolojiler, İstanbul Pendik'te tıbbi cihaz tasarlayan ve
     üreten bir şirkettir. Bugün yurt dışından tedarik edilen tıbbi cihazların Türkiye'de
     geliştirilmesine odaklanır; mekanik tasarım, elektronik, gömülü yazılım ve uygulama yazılımı
     ekip içinde yürütülür. Ürünler: SB-9K doku yüzdürme su banyosu, AhtaPatolog dijital patoloji
     yazılımı (geliştirme aşamasında)."
   - Gerçek fotoğraflar: logo, ofis/atölye, ürün. Doğrulama genelde video ile.
2. **Teknopol İstanbul kaydını düzelttirin** (https://teknopolistanbul.com/firma/ahtapot-tibbi-teknolojiler-a-s/):
   ad "Ahtapot Tıbb**ı**" yazılmış → "Ahtapot Tıbbi Teknolojiler A.Ş."; e-posta boş → `info@ahtapot.ink`.
   Açıklama esas sözleşmedeki faaliyet konusundan alınmış (doğru ama çok geniş: yapay zekâ, robotik,
   biyoinformatik…); isterseniz sitedeki kısa tanımla değiştirilmesini isteyebilirsiniz.
3. **Bing Webmaster Tools** (https://www.bing.com/webmasters): Google hesabıyla girip "Search
   Console'dan içe aktar" — tek tıkla doğrulanır. Bing; DuckDuckGo, Yahoo ve ChatGPT aramasını da besler.
4. **Yandex Webmaster** (https://webmaster.yandex.com.tr): Türkiye'de kullanımı azımsanmayacak.
   Doğrulama için DNS TXT kaydı (Cloudflare → DNS).
5. **LinkedIn şirket sayfası**: açılınca adresini `company.sameAs`'e ekleyin.
6. **Sektör kayıtları ve bağlantılar**: TÜMDEF / MASSİAD / OSTİM Medikal Küme üyelik listeleri,
   üniversite iş birlikleri, distribütör sayfaları, haberler. "Medikal cihaz üretimi" gibi genel
   aramalarda sıralamayı en çok bunlar belirler.

## Sonraki adım (karar sizde)

Genel aramalarda organik sıralama için tek sayfa yetmez: aramayı karşılayan ayrı sayfalar gerekir.
Örnekler: "Tıbbi cihaz yerlileştirme" (şirketin odağı; yurt dışından gelen bir cihazın Türkiye'de
yeniden tasarlanıp üretilmesi nasıl işler), "Doku yüzdürme su banyosu nedir, nasıl kullanılır"
(SB-9K'ya bağlanır), "Dijital patoloji nedir" (AhtaPatolog'a bağlanır). Metinler doğrulanmış
bilgiyle yazılmalı (mevzuat kısıtları geçerli).

## Beklenti

- Dizine girme genelde birkaç gün ile birkaç hafta sürer; başlık değişikliklerinin arama sonucuna
  yansıması da benzer.
- Search Console → Performans raporu 2-3 gün sonra veri göstermeye başlar: hangi aramada kaçıncı
  sırada çıkıldığı oradan izlenir.
