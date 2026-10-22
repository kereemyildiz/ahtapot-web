# Ahtapot Tıbbi Teknolojiler — Kurumsal Web Sitesi

## Proje

Ahtapot Tıbbi Teknolojiler A.Ş. için tek sayfalık (scroll-driven) kurumsal tanıtım sitesi.
Şirket bir **tıbbi cihaz üreticisi**: mekanik tasarım, elektronik, gömülü yazılım ve uygulama yazılımı — hepsi ekip içinde. **Odağı tıbbi cihazları yerlileştirmek**: yurt dışından tedarik edilen cihazların Türkiye'de tasarlanıp üretilmesi. Su banyosu ve SVS görüntüleyici bugünkü ürünler; site şirketi bu ikisine indirgememeli. **İstanbul** merkezli (Pendik), yeni kurulmuş. Kurucu **Dr. Mustafa Can Yılmaz**, bir hekim — aynı zamanda yazılım, elektronik ve mekanikten de anlıyor, işin teknik tarafına bizzat giriyor. Ekip, kurucunun uzun süredir tanıdığı mühendislerden oluşuyor. Ekip büyüklüğü sayıyla yazılmaz ("4 kişilik ekip" ifadesi yanlıştı). Telefon: +90 535 770 66 49 (`company.phone`).

**Hedef kitle (öncelik sırasıyla)**
1. Yatırımcı — "bu ekip gerçekten ürün çıkarabiliyor" demeli
2. Hastane / laboratuvar
3. Distribütör
4. Üniversite / araştırmacı

**Sayfanın tek işi:** Ziyaretçiyi, bu şirketin bir tıbbi cihazı mekaniğinden uygulama yazılımına kadar Türkiye'de uçtan uca geliştirip üretebildiğine ikna etmek ve talep formunu doldurtmak.

**Sitenin konusu tek bir ürün değil, kabiliyettir.** Yatırımcının satın aldığı şey bir cihaz değil, ürün çıkarabilme yeteneğidir. Ürünler bunun kanıtı olarak durur, sitenin merkezi olarak değil. Bu yüzden hero görseli bir ürün değil, şirketin kendisidir (aşağıya bak).

---

## Ana konsept: karanlık oda + logodan türeyen tek çizgi

Logodaki meander işareti bir ahtapottur: bir baş (elmas) ve dik açılarla kıvrılan kollar. Sitenin görsel dili bundan türer.

- **Karanlık oda:** sayfa baştan sona tek bir mavi-siyah zeminde akar; cihazlar, çizimler ve fotoğraflar bu zeminde ışıklı sergi objeleri gibi durur. Varsayılan tema budur. Kullanıcı isteğiyle bir **açık tema** da var (başlıkta güneş/ay düğmesi, `site/ThemeToggle.tsx`); ziyaretçi seçmedikçe site koyu açılır, sistem tercihi izlenmez (marka ilk izlenimi koyu). Açık temada yetkinlik araç ekranları (CAD, kart, IDE, uygulama, saha) ve slayt görüntüleyici de açık pencere olur (kullanıcı: koyu kutular tutarlılığı bozuyordu; zemin `--color-tool`, izometrik yüzler `--color-iso-*`, devre kartı `--color-pcb`, açık zeminde ince kenar `--color-tool-line`). Yalnız mikroskop karşılaştırması koyu ada kalır (`data-theme="dark"`): okülerden görülen siyah alan gerçek görüntünün parçası.
- **Tek çizgi:** logonun meander çizgisi sitenin her yerinde aynı dille devam eder. Hero'da ahtapotun dört kolu dört disipline uzanır; yetkinlikler bölümünde aynı çizgi ilerleme göstergesi olarak kaydırdıkça uzar; iletişimde aynı ahtapotun kolları iletişim satırlarına uzanır (açılış disiplinlere, kapanış size).

Bu bir jenerik "stack diyagramı" değil — markanın kendi logosundan türetilmiş, başka hiçbir şirkete uymayan bir yapı. Yeni ürün eklendiğinde metafor bozulmaz.

### Bölüm akışı

```
HERO            "Tıbbi cihaz, uçtan uca." + logodaki ahtapot, kolları 4 disipline uzanır (HeroNetwork);
                modüle tıklayınca koldan sinyal akar, sayfa o yetkinlik adımına kayar (#kabiliyet-<katman>)
YETKİNLİKLER    5 katman: solda adımlar, sağda sabit sahne; her katman bir mühendislik aracının çalışma ekranı
                mekanik (CAD: dönen tel kafes gövde, gizli kenarlar, ölçüler, kesit, model ağacı, komut satırı)
                → elektronik (kart tasarımı: katmanlar, ayak izleri, 45° izler, net vurgusu, kural denetimi)
                → gömülü (IDE: adım adım çalışan kod, izleme paneli, grafik, seri terminal; canlı PI modeli)
                → uygulama (gerçek AhtaPatolog ekranları, sırayla öne gelen pencereler)
                → saha (izometrik kurum: üç farklı tıbbi cihaz, servis hatları, kurulum/eğitim/kalibrasyon/güncelleme)
ÜRÜNLER         eşit ağırlıkta, veri odaklı, genişleyebilir (aşağıya bak)
HAKKIMIZDA      "Hakkımızda" başlığı, yerlileştirme odağı (okudukça yanan paragraf), tek çizgiyle bağlı
                üç ilke (Pillars: kaydırdıkça uzar, düğümleri yakar), kurucu (stetoskobun hortumu devre
                izine dönüşüp çipe bağlanır; bölüme her girişte yeniden çizilir)
REFERANSLAR     yalnızca gerçek referans varsa; yoksa bölüm hiç render edilmez
İLETİŞİM        talep formu; konuya göre değişen buton metni; logo kendini çizer ve kolları adres/telefon/
                e-posta satırlarına uzanır (ContactReach; kollar satırların gerçek konumundan hesaplanır)
```

Ekip bölümü kullanıcı isteğiyle kaldırıldı; yalnız kurucu anlatılır (Hakkımızda içinde). Kişi listesi geri eklenmez.

İlk hero dışındaki her bölüm aynı açılışla başlar: `SectionRule` (logodaki baş ve kanca kendini çizer, çizgi bölüm boyunca uzanır), başlık `Words` ile kelime kelime maskeden yükselir. Hero'nun giriş çizimi hero'ya geri dönünce ve logonun başına gelince yeniden oynar.

Kullanıcının reddettikleri (tekrar ekleme): yetkinlikler başlığı "Fikirden sahaya, beş katman tek ekipte" ("beş katman tek ekip" söylemi; yerine sade "Mekanik tasarımdan saha desteğine"); kurucu açıklamasının altındaki alan çipleri (Klinik gereksinimler · Yazılım · …); kurucu görselinde tıp artısı/sağlık işareti; yetkinliklerde basit çizimler (araç ekranları gibi gerçekçi ve hareketli olmalı); saha görselinde tek bir su banyosu çizimi (şirket tıbbi cihaz üreticisi); Yetkinlikler'in giriş paragrafı; 1850 ↔ bugün karşılaştırması.

Dev dekoratif yazılar (sayfayı kaplayan "ahtapot" adı, ekranı dolduran fiiller) kullanıcı tarafından reddedildi; tekrar ekleme.

---

## Ürünler bölümü — mimari olarak en önemli kısım

Ürünler **eşit ağırlıktadır**. Hiçbiri hero'yu ele geçirmez. Yeni ürünler eklenecek, o yüzden bu bölüm veri odaklı ve genişleyebilir olmak zorunda.

Her ürün `content/products/<slug>.json` içinde tanımlanır. Bileşen bu dosyalardan render edilir. **Üçüncü ürün eklemek = bir JSON dosyası + görseller. Kod değişikliği gerekmemeli.** Şema: `src/content/schema.ts`.

```ts
type Product = {
  slug: string
  order: number
  status: 'available' | 'in-development'
  interaction: 'simulator' | 'turntable' | 'deepzoom' | 'gallery'
  layers: Array<'mekanik' | 'elektronik' | 'gomulu' | 'uygulama'>
  assets: { gallery, turntable?, simulator?, deepzoom? }
  // metin alanları content/tr.json ve en.json içinde, slug ile eşleşir
}
```

`interaction` alanı hangi bileşenin yükleneceğini belirler (`ProductInteractionView` içinde bir lookup). Her ürün doğasına uygun **tek bir** etkileşim alır:

| interaction | Bileşen | Kime uygun |
|---|---|---|
| `simulator` | Çalışma prensibini canlı gösteren simülasyon (`assets.simulator.kind` → `Simulator.tsx` kayıt tablosu) | Davranışı gösterilebilen fiziksel cihaz |
| `turntable` | Sürükleyerek döndürme: gerçek kare seti (`framesPath`) ya da çizim modeli (`model` → `device/registry.ts`) | Fiziksel cihaz |
| `deepzoom` | OpenSeadragon, gerçek WSI; 2×–40× objektif düğmeleri | Görüntüleme yazılımı |
| `gallery` | Sade ekran görüntüsü galerisi | Diğer / varlığı az olan ürün |

Bilinmeyen `interaction` değeri gelirse `gallery`'ye düş, hata verme. Bilinmeyen simülatör türü `turntable`'a düşer.

`assets.compare` (opsiyonel): ürünün altında mikroskop (oküler, temsili) ↔ dijital slayt karşılaştırması (`products/ScopeCompare.tsx`); kaydırdıkça perde çekilir, fareyle üzerine gelince ayraç imleci izler, dokunmatikte sürüklenir, klavyede ok tuşlarıyla kayar. Metinleri `products.<slug>.compare`.

`layers` alanı ürün kartındaki katman düğmelerini belirler; fiziksel cihazda bir katmana gelince model açılıp o katmanı vurgular. Bu bağ sitenin tezini kanıtlayan şeydir: aynı ekip, farklı katman kombinasyonları.

### Şu anki ürünler

**1. SB-9K doku yüzdürme su banyosu** — `status: available`, `interaction: simulator`, `layers: [mekanik, elektronik, gomulu]`
Histopatolojide mikrotomdan alınan parafin kesitlerini su yüzeyinde germek için; piyasada. Kaynaklar: ürünün kullanma kılavuzu ve SolidWorks montajı (yerelde `Su Isıtıcı SB-9K/`, `.git/info/exclude` ile repo'ya girmez). Simülatör ürünün **gerçek CAD modelini** WebGL'de gösterir (`device/SB9KViewer.tsx`, kenar çizgili gölgeli görünüm — SolidWorks çizimi gibi; kullanıcı "çözünürlük kötü, profesyonel durmuyor" dedi: en az 2x çizilir (1x ekranda süper örnekleme), kontrolcü tuvali 10 px/mm, masaüstünde sahne kare ve cihaz kadrajı büyük): kontrolcü yüzünde 7 segment PV/SV, ışıklı düğmeler, LED camı, su ve yüzen kesit modelin üstünde gerçek ölçüde; güç/LED/SET/▲/▼ izdüşürülen gerçek HTML düğmeleri; "İçini gösterin" gerçek parçaları ayırır (hazne, alt tepsi, ısı transfer plakası, silikon ısıtıcı, taban, SSR, güç kaynağı); katmana gelince diğerleri saydamlaşır. Renk/katman/ayrışma tablosu ürün JSON'unda (`model3d.parts`; parça kimlikleri nötr: `govde`, `hazne`, `dugme`… → `tools/cad` `WEB_PARTS`). Renkler ürün fotoğrafından: mor gövde, siyah çerçeve/tutamak, cihazdaki logo **beyaz baskı** (fotoğraftaki gibi; mavi logo mor gövdede okunmuyordu). Hazne kılavuzdaki gibi mat siyah teflon (ürün metni de bunu söylüyor). Kontrolcü bir **ENDA ET2011** (satın alınan PID kontrolcü); ön yüzü ve davranışı ENDA kılavuzundan: tek 4 haneli kırmızı ekran (ölçülen değer), °F · C/A2 · SSR ışıkları, sağda ▲ üstte, SET ve ▼ altta. SET → "C1.SE.", ilk ▲/▼ ayarı gösterir, sonrakiler 0,1 değiştirir, basılı tutunca hızlanır (`lib/holdRepeat`), 3 sn sonra ölçüme döner. İki ayrı PV/SV ekranı yok; ekleme. Önde temsili bir lam tepsisi var: lama tıklayınca çalışma prensibi oynar (kılavuz Ek-1 adım 5: lam açılı daldırılır, kesitin altından geçirilip kesitle çıkarılır; kamera kesite yaklaşır), sonuç kesitin o anki durumuna göre (düz / kırışık / dağılmış), yeni kesit suya bırakılır. Kullanıcı "oyuncak gibi değil, çizimdeki gibi" istedi; CSS çizimine geri dönülmez, yalnız yedek olarak kalır. Yedek CSS 3B model (`device/WaterBathModel.tsx`) montajın ölçüleriyle çizildi (1 em = 12 mm): 310 × 347 × 91 mm gövde, altta dik şerit ve ~49° yatık ön panel (solda logo, ortada güç ve LED ışıklı düğmeleri, sağda PV/SV kontrolcü), mat siyah teflon hazne, arka iç duvarda LED aydınlatma camı. "İçini gösterin" hazneyi, 150 × 150 mm silikon ısıtıcıyı, 12 V güç kaynağını, SSR'ı, EMI filtresini ve kontrol yazılımını ayırır. Simülatör (`products/simulator/waterBathPhysics.ts`): güç/LED düğmeleri ve kontrolcünün SET/▲/▼ tuşları gerçek düğmeler; hazır ayarlar parafin türüne göre (kılavuz Ek-1); su azsa rezistans ısınır, 150 °C'de ikincil termostat ısıtıcıyı keser ve kontrolcü bunu bilmez (OUT yanar; kılavuz §2.2.2); su yüzeyinde temsili bir parafin kesiti sıcaklığa göre kırışık → düz → dağılma riski. Gerçek üründe kapak, sirkülasyon pompası ve zamanlayıcı yok; eklenmez. Parametreler temsilidir ve ekranda bu açıkça yazar. Kılavuzdaki CE uygunluğu, ±0,1 °C hassasiyet ve 10 yıl yedek parça ifadeleri doğrulanmadan siteye konmaz.

**2. AhtaPatolog (dijital patoloji yazılımı)** — `status: in-development`, `interaction: deepzoom`, `layers: [uygulama]`
Whole-slide image (WSI/SVS) görüntüleme, annotation, vaka yönetimi. Geliştirme aşamasında. Görüntüleyicide gerçek uygulamadaki gibi araçlar: gezin/seç, poligon, dikdörtgen, iki nokta arası mesafe (alan ve uzunluk gerçek µm/px'ten), seçileni sil, mini harita, ölçek çubuğu (`products/DeepZoom.tsx`, `products/deepzoom/annotations.tsx`). Ölçümler araçtır; klinik yorum üretmez.

`status: in-development` olan her ürün görünür bir "Geliştirme aşamasında" rozeti taşır. Bu rozet gizlenemez, küçültülemez, opsiyonel değildir.

Yan yana duran çalışan bir cihaz ve yakınlaşılan bir doku, "hem donanım hem yazılım yapıyoruz" cümlesini yazmadan kanıtlar. İki etkileşimin görsel simetrisini koru.

---

## Stack

- **Next.js 16 (App Router) + TypeScript strict** — `node_modules/next/dist/docs/` güncel doküman; `proxy.ts` (middleware değil)
- **Tailwind CSS v4** — token'lar `src/app/globals.css` içinde `@theme`
- **pnpm** (makinede yoksa `corepack pnpm ...`)
- **next-intl** — TR (varsayılan) / EN, `/tr` ve `/en` prefix'li. Yalnız sunucuda kullanılır; istemci bileşenleri metni prop olarak alır (JS bütçesi). Bağlantılar `next/link` + `src/i18n/href.ts`.
- **GSAP + @gsap/react** — ScrollTrigger, DrawSVG. Hepsi ücretsiz, public `gsap` npm paketinden gelir. `.npmrc`'ye GreenSock auth token'ı **yazma**, Club GSAP üyeliği önerme. SplitText bilinçli olarak kullanılmıyor (kelime bölme sunucuda).
- **Lenis** — smooth scroll, root layout'ta global
- **OpenSeadragon** — yalnızca `deepzoom` etkileşimli ürünlerde, lazy yüklenir
- **three.js** — yalnız ürün verisinde `assets.simulator.model3d` olan simülatörde (SB-9K'nın gerçek CAD modeli, `device/SB9KViewer.tsx`). Modül ve model simülatöre ~2400 px kala boşta önceden indirilir, görüntüleyici ~900 px kala kurulur (~127 KB gzip JS + ~290 KB model); o zamana kadar modelin aynı kameradan çekilmiş statik görüntüsü (`model3d.poster`, `device/SB9KPoster.tsx`; konumu kap yüksekliğine göre, canlı modelle piksel piksel üst üste) görünür, model ilk karesini çizince söner. CSS çizim modeli yalnız WebGL yoksa (kullanıcı: yüklenirken "eski model" bir an görünüyordu). Poster model/renk/kamera değişince yeniden çekilir: `tools/cad/README.md` → "Poster". Model `tools/cad/` ile SolidWorks montajından üretilir (bkz. `tools/cad/README.md`). Kaydırmayı kilitlememek için (ölçüldü): kenar çizgileri modele gömülü (tarayıcıda hesaplanmaz), ortam haritası/PMREM yok (küçük küp doku), kurulum adımları `requestIdleCallback` ile boşta (bağlam → ayrıştırma → `compileAsync` → 1 px ön çizim), simülasyondan gelen değişiklikler en çok 4 Hz çizilir. `MeshoptDecoder.useWorkers` kullanma: üretim küçültmesi Worker kodunu bozuyor, model hiç açılmıyor.
- **Cloudflare Workers + OpenNext** — hosting kararı (Vercel Hobby ticari kullanıma kapalı). Plan ve açık sorular: `docs/deploy-cloudflare.md`. Alan adı GoDaddy'de kalır, nameserver'lar Cloudflare'e taşınır.
- **Geliştirme:** `pnpm dev` Turbopack ile çalışır. Webpack dev her yeniden derlemede belleği büyütüyordu (12 derlemede 1,3 → 2,6 GB); Turbopack 0,5 GB civarında kalıyor. `build` şimdilik `--webpack`. Telefondan test: aynı ağda `http://<bilgisayarın IP'si>:3000`; `next.config.ts` → `allowedDevOrigins: ["192.168.*.*"]` olmadan Next 16 dev kaynaklarını engeller ve telefonda JS çalışmaz (yalnız geliştirmeyi etkiler).
- **Resend + Zod** — iletişim/talep formu, `app/api/contact/route.ts`. Zod yalnız sunucuda; istemci ön doğrulaması `lib/contact/validate.ts` (zod'suz, aynı kurallar).

İstemci bileşenleri zod şemasını (`content/schema.ts`) değer olarak import etmez; sabitler `content/constants.ts`'te.

### SEO
Kullanıcı: "Google'da çıkmıyoruz." Canlıda `/robots.txt` 500 dönüyordu (bilinmeyen ilk segment `[locale]` layout'unda notFound → Worker 500; Google 5xx robots.txt'de siteyi taramaz). Şimdi: `app/robots.ts`, `app/sitemap.ts` (her sayfa iki dilde, hreflang), `[locale]/layout.tsx` → `dynamicParams = false` (bilinmeyen yol 404), `lib/seo.ts` → `pageAlternates` (canonical + hreflang + x-default; layout'a değil her sayfaya, yoksa alt sayfalar ana sayfanın canonical'ını miras alır), `shareMetadata` (Open Graph / X, görseller `public/og/{tr,en}.png`: hero'nun 1200×630 ekran görüntüsü, hero değişince yeniden çek), `organizationJsonLd` (ana sayfada Organization + WebSite, değerler `content` → `company`). Ana sayfa başlığı `meta.homeTitle` (marka + ne yaptığı). Product şeması bilinçli olarak yok (fiyat/teklif alanı ister; satış dili yasak). Search Console adımları: `docs/seo.md`.

### İçerik
CMS yok. Metinler `content/tr.json` ve `content/en.json`, ürün tanımları `content/products/*.json`, dilden bağımsız görseller ve atıflar `content/media.json`. Hepsi zod ile doğrulanır; bir dilde olup diğerinde olmayan anahtar build'i kırar. İleride Sanity'ye taşınabilmesi için içeriği düz metin tut, JSX gömme.

### Kullanılan skill'ler
skill-issue.in'den: ui-ux-pro-max (tasarım sistemi ve UX kuralları), taste-skill (sanat yönü "dark room", tipografi), resmi gsap-skills, web-design-guidelines. Grafikler için dataviz skill'i (renk doğrulayıcı, tek eksen, hover katmanı). Context7 MCP (sürüme özgü doküman) ve Chrome DevTools MCP (render doğrulama + performans ölçümü).

---

## Design tokens

Kesindir. Yeni renk uydurma, yeni font ekleme. Tanım: `src/app/globals.css` (koyu `@theme`'de; açık değerler `:root[data-theme="light"]` altında, koyu ada için `[data-theme="dark"]`).

```css
@theme {
  --color-ground:     #0a0c16;  /* zemin: marka mavisiyle tonlanmış siyah */
  --color-surface:    #12162a;  /* panel / sahne */
  --color-surface-2:  #1b2038;  /* düğme, çip */
  --color-ink:        #eef0f6;  /* metin */
  --color-muted:      #a2a8bc;  /* ikincil metin (zeminde AA) */
  --color-accent:     #d7f89a;  /* fosfor yeşili — tek vurgu */
  --color-brand:      #3e52e0;  /* logo mavisi */
  --color-periwinkle: #93a4f4;  /* çizimler, logo degradesinin açık durağı */
  --color-eosin:      #e0518a;  /* yalnız patoloji işaretlemesi ve aktif işaretleme durumu */
  --color-field:      #e9ecf4;  /* form alanları, "geliştirme aşamasında" rozeti */
  --color-field-line: transparent; /* alan/rozet kenarı (açık temada 3:1 kenar) */
  --color-alert:      #ff9db8;  /* uyarı metni ve rozeti (form hatası, su az) */
  --color-wire:       #2b3566;  /* logodan uzanan kolların sönük hali */
  --color-node:       #151a33;  /* hero modül kutusu; --color-node-on #1d2445 etkin */
  --color-tool:       #0b0e1a;  /* yetkinlik araç ekranı / slayt görüntüleyici zemini */
  /* --color-iso-top/left/right (saha çizimi yüzleri), --color-pcb (kart), --color-tool-line (açıkta pencere kenarı) */
}
```

Açık tema (OKLCH'de aynı tonlardan türetildi, `oklch-skill`; metin çiftleri WCAG AA hesapla doğrulandı): ground `oklch(0.975 0.006 275)`, surface `0.948`, surface-2 `0.915`, ink `oklch(0.21 0.035 275)`, muted `oklch(0.49 0.03 275)`, accent `oklch(0.5 0.13 131)` (fosfor izi açık zeminde koyulaşır; üstünde açık metin), periwinkle `oklch(0.56 0.13 274)`, eosin `oklch(0.55 0.18 359)`, field beyaz + `field-line` `oklch(0.6 0.03 275)`, alert `oklch(0.52 0.17 2)`, tool `oklch(0.99 0.003 275)` (açık pencere), tool-line `oklch(0.89 0.018 275)`. Marka mavisi ve logo iki temada aynı. Yeni bir renk eklerken iki temada da değer ve kontrast hesabı gerekir; bileşende tema rengini hex olarak yazma (cihaz/ekran çizimleri hariç).

- **Fosfor yeşili** (hasta monitörü / osiloskop izi): birincil aksiyon, odak halkası, etkin durum, canlı veri izi. Başlık rengi veya gradyan olarak kullanma.
- **Eosin** H&E patoloji boyamasının gerçek rengidir; buton dolgusu, başlık rengi veya gradyan olarak kullanma.
- **Logo her zaman mavi:** işaret `LogoMark` (koyu mavi → periwinkle degrade, `LOGO_BLUES`), yazı `public/brand/wordmark.png` (düz mavi). Açık zeminde tam logo `public/brand/logo-full.png`. Logoyu beyaza/başka renge çevirme. Tek istisna: SB-9K modelindeki cihazın üstündeki baskı, gerçek üründeki gibi beyaz (kullanıcı isteği).

### Tipografi

| Rol | Font | Kullanım |
|---|---|---|
| Display | **Instrument Sans** | Başlıklar, 500–600 ağırlık, sıkı harf aralığı |
| Gövde | **Onest** | Paragraf, liste, buton, etiket |
| Kod | **JetBrains Mono** | Yalnızca gerçek kod bloklarında |

Unbounded kullanıcı isteğiyle bırakıldı ("d" eğik, geniş yuvarlak formlar kurumsal durmuyordu); yerine dik ve sakin bir grotesk olan Instrument Sans geldi. Geri alma.

Üçü de `next/font/google`, `subsets: ['latin', 'latin-ext']` — **latin-ext zorunlu**. Büyük harf CSS ile ve doğru `lang` altında uygulanır (Türkçe i→İ). `µm` gibi birimler uppercase'e sokulmaz.

### İkonlar
Tek set: `components/brand/Icon.tsx` (24'lük ızgara, 1.75 çizgi, kare uç, sivri köşe — meander diliyle aynı). Bağımlılık yok; yeni ikon gerekirse oraya path olarak eklenir. Ölçülü kullanılır: birincil aksiyonlarda ok, geri bağlantılarında sol ok, yeni sekmede açılan bağlantıda çapraz ok, iletişim ayrıntılarında (adres/e-posta/telefon), menü düğmesi, dil seçicide küre. Disiplin ikonları (`LAYER_ICON`: küp, devre, kod, pencere, harita) hem yetkinlik adımı başlığında hem ürün kartının katman çiplerinde aynıdır: aynı ekip, farklı katmanlar. Uyarı ikonu durumu renkten bağımsız da anlatır (form hataları, su az, ikincil termostat, kırışık/dağılmış kesit); başarıda onay işareti. Simülatör kontrollerinde ampul, damla, katmanlar, termometre. İlkeler bölümüne ikon konmaz (üç sütun × ikon kalıbı jeneriktir). İkon tek başına anlam taşımaz; yanında metin ya da `aria-label` olur.

Tema ve dil düğmeleri başlıkta en sağda, "Görüşme talep edin"den sonra ince bir çizgiyle ayrı ve birbirinden aralıklı (kullanıcı: bitişik duruyordu). Dil seçici: küre + `TR | EN` anahtarı, etkin dil dolu. Ürün adı logodaki mavi çubukla tabela gibi durur (`ProductExhibit`).

### Yasaklı liste
Inter. Mor/menekşe gradyan. Glassmorphism. `rounded-2xl` + `p-6` + `shadow-lg` üçlü kart ızgarası. Emoji ikon. Stok "iş insanları el sıkışıyor" görseli. Sebepsiz 01/02/03 numaralandırma. Jenerik 3D küre/parçacık arka planı. Eyebrow etiketleri (başlık üstü küçük etiket). Sayfayı kaplayan dekoratif dev yazılar. Gerçek ürün/ekip fotoğrafıymış gibi sunulan stok görsel. Katman anlatısını jenerik bir infografiğe çevirme — logodaki çizgiden türemeli.

---

## Layout

- Eşit dış kenar boşlukları (`--gutter`), 12 kolon ızgara; asimetri ızgaranın içinde.
- Her bölümün görünür bir başlığı var; ilk ekranda tek `h1`.
- Border radius 0. Meander dik açılıdır, yuvarlak köşe onunla çelişir. İstisna: logo ve fotoğraf maskeleri.
- Oranlı kutuya (`aspect-*`) `max-h` verilecekse `w-full` da ver: genişlik auto iken tarayıcı yükseklik sınırını oran üzerinden genişliğe aktarır ve kutu sütundan daralır (AhtaPatolog görüntüleyicisi geniş ekranda sağda ~200 px boşluk bırakıyordu; flex sütundaki simülatörde görünmüyordu).
- Mobilde sabit sahneler ve yan raylar iner; görseller adımların içine girer.

---

## Animasyon kuralları

**Lenis + GSAP senkronizasyonu — atlarsan ScrollTrigger kayar:**
```ts
const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```

- React tarafında **her zaman `useGSAP`**, `useEffect` değil (zamanlayıcı/gözlemci gibi GSAP dışı abonelikler hariç). Selector'ları scope'la.
- `gsap.matchMedia()` ile `prefers-reduced-motion` dallanması. Reduced motion açıksa: çizimler tek seferde çizili görünür, hiçbir içerik erişilemez hale gelmez. Giriş animasyonunun gizli başlangıç durumu yalnız `@media (scripting: enabled)` altında uygulanır. Layout'a inline `<script>` yalnız bir tane var: `<head>`'deki tema betiği (seçimi ilk boyamadan önce uygular). İstemcide çizilen `<script>` React 19'da uyarı verir ve çalışmaz; bu yüzden kök layout istemcide yeniden çizilmemeli: dil seçici `next/link` değil düz `<a>` (tam sayfa gezinme). Başka inline betik ekleme; `next/script` `beforeInteractive` App Router'da Next çalışma zamanıyla geç çalışır, tema için işe yaramaz.
- **LCP adayı gizlenmez:** hero metni opaklıkla değil yalnız transform ile girer (`.hero-rise`).
- **Scroll-jack yok:** kullanıcı scroll kontrolünü asla kaybetmez. Tekerlek olayını yakalayan etkileşimler (deepzoom) yalnız kullanıcı tıklayınca ya da Ctrl/⌘ ile yakalar ve o sırada `data-lenis-prevent` taşır; imleç çıkınca bırakır. Turntable/simülatör tekerleğe hiç dokunmaz, yalnız sürükleme.
- GSAP ile CSS değişkeni tween'lerken başlangıcı `fromTo` ile açık ver; `var(...)` string'i renk tween'inde interpolasyon yapılamaz. Tema rengini GSAP'la tween'leme (tema değişince eski renk satır içinde kalır): 0..1 bir değişken tween'le, rengi CSS'te `color-mix` ile token'lardan karıştır (`.scrub-word` → `--lit`, `.pillar-node` → `--on`).
- Yolda akan darbe/işaret için `pathLength` + CSS `stroke-dashoffset` kullanma: Chrome CSS'teki dashoffset'i pathLength'e göre ölçeklemiyor. `lib/svgPath.ts` → `pulseDash` (akan darbe) ve `drawDash` (kendini çizen yol) gerçek uzunluğu (`--len`) verir.
- "Bölüme her girişte yeniden çiz" için `lib/replayOnView` (IntersectionObserver): ScrollTrigger'ın onLeave/onLeaveBack ile başa sarma, refresh sırasında tetiklenip çizimi başa sarılı bırakıyordu (mobilde hiç görünmüyordu).
- `useGSAP` içindeki "bir kez oldu" bayraklarını `useRef`'te değil, efektin içinde tut: StrictMode ikinci kurulumda başlangıç durumunu yeniden uygular, ref'teki bayrak ise animasyonu atlatır.
- Hover mikro-etkileşimleri 150–250ms. Bölüm reveal'ları 400–600ms.
- Yerleşim tetikleyen özellik (`left`, `width`, `font-size`) animasyonla sürülmez; `transform` kullanılır. Karşılaştırma ayracı tam genişlikte bir taşıyıcıyla `translateX`, su banyosu modelinin yakınlaşması `scale` ile (eski `font-size` yöntemi 1 sn'de ~140 ms yerleşim harcıyordu).
- Sık değişen CSS değişkeni büyük bir alt ağacın köküne her karede yazılmaz: kullanan elemana yazılır (hero imleç ışığı → `.hero-spot`) ya da adımlanıp yalnız değişince yazılır (simülatör `--heat`, 0,05 adım). Çalışan bir animasyonun `animation-duration`'ı değişkene bağlanmaz; ilerleme sıçrar.
- Hover rengi değiştiren özel kurallar `@media (hover: hover)` içinde (Tailwind `hover:` bunu kendisi yapar); yoksa dokunmatikte dokunulan buton hover renginde kalır.
- Easing: giriş/geçişte CSS `--ease-out-expo` (`ease-out-expo` utility), GSAP `expo.out` / `power3.out`; çizgi çizimlerinde `power2.inOut`. Zıplayan eğri (`back.out`, bounce) kullanılmaz: ciddi bir tıbbi cihaz markasına uymuyor.

---

## Performans bütçesi

Pazarlık konusu değil. Chrome DevTools MCP ile ölç, tahmin etme.

- LCP < 2.5s, CLS < 0.1, INP < 200ms — 4G throttle, mid-tier mobil (son ölçüm: LCP 1,28 s, CLS 0)
- Scroll orta seviye telefonda 60fps korumalı
- OpenSeadragon, turntable ve simülatör `dynamic(..., { ssr: false })`; simülasyon döngüsü yalnız görünürken çalışır
- Sonsuz CSS animasyonu içeren bölümler `lib/useOffscreenPause` ile ekran dışındayken durur; yetkinlik araç ekranlarının JS döngüleri (CAD karesi, IDE adımı, PCB net vurgusu, saha döngüsü) yalnız sahne etkin ve görünürken çalışır
- Mobilde: deepzoom yerine statik poster + "Görüntüleyiciyi açın" butonu
- Görseller `next/image`, açık `sizes`
- Toplam JS < 200KB gzip (OpenSeadragon ve simülatörün three.js'i hariç; ikisi de yalnız ilgili bölüme gelince yüklenir). Son ölçüm ~204 KB (modern tarayıcı; `noModule` polyfill hariç); ~130 KB'ı React + Next tabanı — yeni bağımlılık eklemeden önce ölç. İlk ekranın altındaki ağır istemci bileşenleri (yetkinlik araç ekranları, karşılaştırma, simülatör, görüntüleyici) `next/dynamic` ile ilk yüklemenin dışında tutulur.

## Erişilebilirlik

- Klavyeyle tüm sayfa gezilebilir, focus halkası görünür (`--color-accent`)
- Renk kontrastı WCAG AA
- `lang` attribute i18n ile doğru set edilir
- Form: her input'ta `<label>`, hatalar `aria-live` ile
- Grafiklerde kimlik yalnız renkle verilmez (lejant + doğrudan etiket + kesikli çizgi)

---

## İçerik ve dil

**Ton:** Profesyonel ve kurumsal, ama şişkin değil. Ziyaretçiye **"siz"** diye hitap edilir. Kısa, somut, aktif cümleler. Samimi/argo ifadeler ("aynı odada yapıyoruz", "kendini bu masada görüyorsan") kullanıcı tarafından reddedildi.

- ❌ "Sağlık teknolojilerinde yenilikçi çözümler sunarak sektöre değer katıyoruz."
- ❌ "Küçük bir ekibiz ve bunu saklamıyoruz."
- ❌ "…hekim liderliğindeki tek bir mühendislik ekibiyle geliştiriyoruz." (kullanıcı: saçma; "tek ekip" vurgusu yapılmaz)
- ❌ "…gövdesinden devresine, kodundan ekranına." (kullanıcı beğenmedi)
- ❌ "Tıbbi cihazları yerlileştiriyoruz: …" (kullanıcı önceki cümleyi daha iyi buldu)
- ✅ "Klinikte tarif edilen bir ihtiyacı, sahada çalışan bir cihaza uçtan uca dönüştürüyoruz."

Şirketin adı **Ahtapot Tıbbi Teknolojiler** (“Teknolojileri” değil); footer'da logonun yanında yazar.

Ürün adı **AhtaPatolog** (AhtaPatoloji değil). Türkçe eklerde ünlü uyumuna dikkat: AhtaPatolog'da, AhtaPatolog'un.

Buton metinleri ne olacağını söyler: "Teklif isteyin", "Demo talep edin", "Görüşme talep edin" — "Gönder" veya "Daha fazla" değil. Aksiyon adı akış boyunca değişmez.

Boş/hata durumları yön verir, özür dilemez.

Kurucunun cinsiyeti belirtilmedi; İngilizce metinde he/she zamiri kullanma.

### İngilizce
Çeviri değil yeniden yazım. Yatırımcı büyük ihtimalle EN okuyacak; EN kalitesi TR'den düşük olamaz.

---

## Mevzuat kısıtları — ihlal etme

Bu bir tıbbi cihaz şirketi. Metinde şunlar **kesinlikle** olmayacak:

1. **Tanı iddiası yok.** Dijital patoloji yazılımı için "tanı koyar", "teşhis eder", "hastalık tespit eder" yazma. Doğru dil: "patoloğun incelemesi için görüntüleme, işaretleme ve vaka yönetimi sağlar". Yazılım karar destek aracıdır, karar verici değildir.
2. **Sahip olunmayan sertifika belirtilmez.** CE, ISO 13485, TİTCK/ÜTS kaydı — sadece gerçekten varsa ve belge numarasıyla. Emin olunmayan hiçbir sertifika logosu konmaz.
3. **Geliştirme aşamasındaki ürün açıkça etiketlenir** (`status: in-development` rozeti). Yatırımcıya karşı da doğru olan bu; abartı yakalandığında güven sıfırlanır.
4. **Klinik performans iddiası yok.** Doğruluk oranı, duyarlılık, "%X daha hızlı tanı" gibi ifadeler klinik veri olmadan yazılmaz.
5. Türkiye'de tıbbi cihazların halka yönelik reklamı kısıtlıdır. Site tanıtım ve bilgilendirme dilinde kalır; satış vaadi, kampanya, fiyat dili kullanılmaz.
6. **Simülasyon ≠ spesifikasyon.** Simülatör parametreleri temsilidir; ekranda bunu söyleyen not kaldırılamaz.

Bir metin bu sınırda mı diye tereddüt edersen yaz ama işaretle, kullanıcıya sor. Sessizce iddia üretme.

### KVKK
- Formda açık rıza checkbox'ı (önceden işaretsiz) + aydınlatma metnine link
- `/kvkk` ve `/gizlilik` sayfaları — şablon, üstünde "hukuk kontrolünden geçmeli" notu
- Analytics yok, tracking cookie yok → çerez banner'ı da yok. Bilinçli sadeleştirme, ekleme.
- Form verisi Resend ile mail olarak gider, veritabanında saklanmaz

### Görseller
Şu an sitede açık lisanslı fotoğraf yok: yetkinlik sahneleri araç ekranı çizimleri, ürünlerde kendi ekran görüntüleri ve WSI. İleride açık lisanslı bir fotoğraf eklenirse `public/images/world/` altına konur, atfı `content/media.json` → `credits`'e yazılır; `/kaynaklar` sayfası ve footer'daki "Görsel kaynakları" bağlantısı yalnız atıf varken görünür (uzun atıf metni kullanıcı isteğiyle footer'da yer almaz). Böyle fotoğraflar `photo-duo` ile gösterilir (gri ton × periwinkle; parlaklık `--duo-bright`), yalnız fotoğrafı saran kaba uygulanır. Hiçbiri Ahtapot'un kendi ürünü/ekibi gibi sunulmaz.

---

## Çalışma şekli

1. Kod yazmadan önce **plan sun**. Bölüm bölüm ilerle, tek seferde tüm siteyi üretme.
2. Her görsel bölümden sonra Chrome DevTools MCP ile ekran görüntüsü al, kendi çıktını eleştir, sonra devam et.
3. İçerik `content/`'ten gelir. Component içine metin veya ürün verisi gömme.
4. Placeholder kullandığında dosyada `TODO:` ile işaretle ve `docs/mock-data-todo.md`'ye yaz.
5. Uydurma yapma: teknik spesifikasyon, sertifika, müşteri adı, referans, sayı — verilmediyse `TODO` bırak.
6. Emin olmadığın kütüphane API'si için Context7 MCP'ye bak. GSAP için resmi gsap-skills'i kullan.
7. **Genişleyebilirliği koru.** Ürüne özel mantığı bileşene gömme; `interaction`, `status` ve `assets` alanlarından türet. Üçüncü ürün bir JSON dosyasıyla eklenebilmeli.

### Git akışı
- `main` = canlı site (`ahtapot.ink`). Her push Cloudflare Workers Builds ile **otomatik yayınlanır**. Doğrudan `main`'e commit atma.
- `develop` = entegrasyon dalı. Push'ları canlıya dokunmaz, Cloudflare önizleme sürümü üretir.
- Yeni iş: `develop`'tan `feature/<kısa-ad>` (hata düzeltmesi `fix/<kısa-ad>`) aç → bitince `develop`'a merge → önizlemede kontrol → kullanıcı onaylayınca `develop`'u `main`'e merge.
- `main`'e merge ve push yalnız kullanıcı açıkça istediğinde.
