# SEO — arama motorunda görünme

## Durum (23 Ekim 2026)

Google'da 7 sayfa dizinde: ana sayfa (`https://ahtapot.ink` adresiyle; kök `/tr`'ye 307 ile yönlendiği
için Google kök adresi gösteriyor, sorun değil), `/en`, iki dilde iki ürün sayfası, `/en/gizlilik`.
22 Ekim'de yalnız ana sayfa vardı. Ana sayfanın sonuçtaki başlığı henüz eskisi; yeniden taramayla
değişir. Search Console'da veri henüz çok az (28 günde 2 gösterim).

| Arama | Durum | Gerçekçi hedef |
|---|---|---|
| ahtapot tıbbi | 1. ve 3. sıra | korunur |
| ahtapot tıbbi teknolojiler | 1., 3., 4. ve 9. sıra; 2. sırada Teknopol kaydı | korunur |
| ahtapot medikal | 1. sıra (22 Ekim'de yoktuk) | korunur |
| ahtapot teknolojileri | 7. sıra | üst sıralar: İşletme Profili, LinkedIn, bağlantılar |
| ahtapot teknoloji | ilk 20'de yokuz; Teknopol kaydımız 6. sırada | aşağıya bakın |
| ahtapot elektronik | yokuz; ASELSAN'ın AHTAPOT sistemi ve tripodlar | zor; marka bilinirliği ve bağlantılarla uzun vadede |
| ahtapot | hayvan, yemek, başka firmalar | kısa vadede gerçekçi değil; marka paneli İşletme Profili ile gelebilir |
| doku yüzdürme su banyosu | distribütörler (Lauda, Biobase…) | 1. sayfa: SB-9K sayfası dizine girince |
| dijital patoloji yazılımı | Virasoft, Roche, Leica… | ürün sayfası başlığında artık bu ifade var; üst sıralar içerik ve bağlantı ister |
| medikal / tıbbi cihaz üretimi, tıbbi cihazlar | dernekler, TİTCK, büyük firmalar + **harita sonuçları** | harita kutusu (İşletme Profili); organik için ayrı içerik sayfası gerekir |

**"ahtapot teknoloji"**: bu ad başka bir firmanın. Ahtapot Yazılım Teknolojileri'nin alan adı
`ahtapotteknoloji.com`, Instagram hesabı `@ahtapot.teknoloji`; ilk sayfanın çoğu bu firmanın sitesi,
Instagram'ı, LinkedIn'i ve Ahtapot Robotik. Bu aramada 1. sıra gerçekçi değil; 1. sayfa gerçekçi.
Bunun için sitede yapılacak bir şey kalmadı. İlk sayfaya giren sonuçlar sitenin dışındaki kayıtlar:
- Google İşletme Profili: marka aramalarında sağda şirket kutusu çıkar.
- LinkedIn şirket sayfası: bu aramada Ahtapot Yazılım'ın LinkedIn sayfası ilk sayfada.
- Teknopol kaydı: bu aramada zaten 6. sırada. Kayıtta sitemize bağlantı yoksa eklettirin.
- İsteğe bağlı Instagram hesabı: bu aramada Instagram profilleri iki kez ilk sayfada.

"Ahtapot Teknoloji" adını sitede ya da yapılandırılmış veride diğer ad (`alternateName`) olarak
kullanmayın. Başka bir firmanın markası; Google iki şirketi tek şirket sanabilir.

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

Karışma riski: "Ahtapot" adı ASELSAN'ın AHTAPOT sistemi, TÜBİTAK/Pardus'un Ahtapot güvenlik yazılımı,
Ahtapot Robotik ve Ahtapot Yazılım Teknolojileri (ahtapotteknoloji.com) gibi başka işlerle ortak. Bunlarla bağınız yoksa `/llms.txt`'ye bunu söyleyen bir
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
  belge no 2026-1713, onay 11.09.2026, 3 yıl geçerli (Eylül 2029). Footer'da, belgedeki gibi
  Millî Teknoloji Hamlesi logosuyla yan yana (kullanıcı: rozetler footer'da; Hakkımızda'da belge metni
  gereksiz; telif satırının yanında, ayrı satır değil). Belge numarası logonun alt metninde, yapılandırılmış veride `award` ve `/llms.txt`'de.
  Logolar Bakanlığın Teknogirişim portalındaki resmî PNG'lerden (`tools/brand/badges.py`); koyu tema
  için lacivert/siyah kısımları açık renge çevrilmiş ikinci sürüm. Bir ürün sertifikası değildir;
  ürünlerin yanında kullanılmaz. 2029'da yenilenmezse kaldırılmalı.
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
   Kayıtta sitemize bağlantı yoksa `https://ahtapot.ink` eklensin. Kayıt "ahtapot teknoloji", "ahtapot medikal" ve
   "ahtapot tıbbi teknolojiler" aramalarında ilk sayfada; bu sayfadan gelen bağlantı siteye doğrudan
   güç verir. (23 Ekim'de Teknopol sitesi kapalıydı, 522 hatası verdi; bağlantı kontrol edilemedi.)
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

## Sıralama planı (23 Ekim 2026)

Hedef (kullanıcı): "ahtapot teknoloji", "dijital patoloji yazılımı", "yerli tıbbi cihaz",
"medikal / tıbbi cihaz üretimi" aramalarında en üstte çıkmak.

Her aramada eksik olan ne (sayfa mı, tanınırlık ve bağlantı mı):

| Arama | Bugün | İlk sayfada kimler var | Eksik |
|---|---|---|---|
| ahtapot teknoloji | ilk 20'de yokuz | aynı adlı başka firma (Ro Paket), Ahtapot Robotik, Pardus Ahtapot | tanınırlık: Google bu adı başka firmanın sanıyor |
| dijital patoloji yazılımı | yokuz | Virasoft, Roche, Leica, Memorial, Siemens (ürün ve çözüm sayfaları) | sayfa ve bağlantı: AhtaPatolog sayfası 141 kelime, ana başlığında "dijital patoloji" geçmiyor |
| yerli tıbbi cihaz | yokuz | TRT Haber, MASSİAD, TÜSEB, KOSGEB, üretici firmalar | konu sayfası, haber, dernek kaydı |
| medikal / tıbbi cihaz üretimi | yokuz | Karel'in fason üretim (EMS) sayfası, OSTİM Medikal Küme, TİTCK, SEİS, MASSİAD, TÜMDEF; harita kutusu | hizmet sayfası, dernek kaydı, İşletme Profili |

Google'ın arama önerileri (insanların gerçekte ne yazdığı): "dijital patoloji nedir / sistemleri /
cihazı / yapay zeka / slayt tarama cihazı"; "tıbbi cihaz üretimi yapan firmalar / için gerekli
belgeler / nedir"; "yerli tıbbi cihaz üretimi"; "tıbbi cihaz üreticileri derneği". "dijital patoloji
yazılımı" için öneri çıkmıyor: az aranıyor, "dijital patoloji sistemi" ve "nedir" daha çok aranıyor.

### Sitede (Claude yapar, metni kullanıcı doğrular)
1. **AhtaPatolog sayfasını genişletmek.** Ana başlığın altında "dijital patoloji yazılımı" ifadesi
   geçer. Bölümler: ne işe yarar; özellikler (WSI/SVS görüntüleme, işaretleme, alan ve uzunluk ölçümü,
   vaka yönetimi); iş akışı; sık sorulanlar ("Tanı koyar mı?" Hayır, patoloğun incelemesi için bir
   araçtır); geliştirme durumu. Sayfadaki, tarayıcıda çalışan gerçek WSI görüntüleyici rakiplerde yok.
2. **SB-9K sayfasını genişletmek.** "doku yüzdürme su banyosu" aramasında 3. sıradayız. Metin
   kılavuzdan alınır: parafin türüne göre sıcaklık, LED aydınlatma, teflon hazne, ikincil termostat.
   Doğrulanmamış CE, ±0,1 °C ve 10 yıl yedek parça ifadeleri yazılmaz.
3. **Yeni sayfalar.** Menüde tek kelimelik bir bölümün altında toplanır (ör. "Rehber"):
   - "Dijital patoloji nedir?": AhtaPatolog'a bağlanır.
   - "Tıbbi cihaz yerlileştirme / yerli tıbbi cihaz üretimi": şirketin odağı, SB-9K örneğiyle.
     Yerlilik oranı gibi sayılar ancak belgeyle yazılır.
   - "Tıbbi cihaz tasarım ve üretim hizmeti": yalnız şirket başka firmalara veya hastanelere tasarım
     ve üretim hizmeti veriyorsa (kullanıcıya soruldu).
   - İsteğe bağlı: "Doku yüzdürme su banyosu nedir, nasıl kullanılır?"
4. Ana sayfadan ve ürün sayfalarından bu sayfalara iç bağlantı verilir. Her sayfa iki dilde olur,
   site haritasına, hreflang'e ve içerik yoluna (breadcrumb) eklenir.

### Site dışında (kullanıcı yapar; öncelik sırasıyla)
1. **Google İşletme Profili**: "medikal cihaz üretimi" aramasındaki harita kutusu ve marka
   aramalarında sağdaki şirket kutusu için (bilgiler aşağıda, "Sizin yapmanız gerekenler").
2. **Teknopol kaydı**: siteye bağlantı eklenir, ad düzeltilir. Kayıt üç marka aramasında ilk sayfada.
3. **LinkedIn şirket sayfası** ve gönderiler (Teknogirişim Rozeti, ürünler).
4. **Dernek üyeliği**: MASSİAD (Marmara bölgesindeki tıbbi cihaz üreticileri; massiad.org.tr) ve
   TÜMDEF (federasyon; tumdef.org). Üye listeleri "medikal cihaz üretimi" ve "tıbbi cihaz üreticileri"
   aramalarında ilk sayfada; listede siteye bağlantı istenir. OSTİM Medikal Küme Ankara'da.
5. **Haber**: SB-9K'nın Türkiye'de tasarlanıp üretilmesi üzerine bir basın bülteni. Gönderilecek
   yerler: Teknopol haberleri, sektör yayınları (Medikal Akademi, Ekonomi Gazetesi sektör haberleri),
   ajanslar. "yerli tıbbi cihaz" aramasında 1. sırada bir haber var (TRT Haber).
6. **Yerli Malı Belgesi** (bu bir iş kararı): yerli katkı oranı %51 ve üzeri olan ürüne oda verir.
   Kamu ihalelerinde %15 fiyat avantajı sağlar; sanayi sicil belgesi ve kapasite raporu ister. Alınırsa
   belge numarasıyla sitede yazılabilir.
7. **Dijital patoloji tarafı**: patoloji kongrelerinde (Türk Patoloji Derneği) görünürlük,
   üniversitelerin patoloji bölümleriyle gerçek iş birlikleri ve bunların duyuruları.
8. Bing Webmaster, Yandex Webmaster, Wikidata (aşağıdaki listede).

Kural: bağlantı satın alınmaz (Google'ın bağlantı spam politikası). Ücretli bir yerleşim varsa
bağlantısı `nofollow` ya da `sponsored` olmalı. Bağlantı metnini karşı taraf seçer.

### Beklenti
- **ahtapot teknoloji**: profiller açıldıktan sonra haftalar ile aylar içinde 1. sayfa. Bu adın
  sahibi başka bir firma; 1. sıra gerçekçi değil.
- **dijital patoloji yazılımı**: sayfa genişletmesi ve birkaç bağlantıyla 3–6 ayda 1. sayfa hedefi.
  Üst sıralar ürün piyasaya çıkıp referans aldıkça gelir.
- **yerli tıbbi cihaz, medikal cihaz üretimi**: 6–12 ay. Rakipler devlet kurumları, dernekler, büyük
  firmalar ve haber siteleri. Dernek listeleri, harita kutusu ve haberle ilk sayfa mümkün; 1. sıra
  garanti edilemez.
- Ölçüm: Search Console ayda bir; aynı aramaların sırası 30. ve 90. günde yeniden kontrol edilir.

## Beklenti

- Dizine girme genelde birkaç gün ile birkaç hafta sürer; başlık değişikliklerinin arama sonucuna
  yansıması da benzer.
- Search Console → Performans raporu 2-3 gün sonra veri göstermeye başlar: hangi aramada kaçıncı
  sırada çıkıldığı oradan izlenir.
