# Ahtapot Tıbbi Teknolojiler — Kurumsal Web Sitesi

## Proje

Ahtapot Tıbbi Teknolojiler A.Ş. için tek sayfalık (scroll-driven) kurumsal tanıtım sitesi.
Şirket medikal cihaz geliştiriyor: mekanik tasarım, elektronik, gömülü yazılım ve uygulama yazılımı — hepsi ekip içinde. Ankara merkezli, yeni kurulmuş. Kurucu bir doktor — aynı zamanda yazılım, elektronik ve mekanikten de anlıyor, işin teknik tarafına bizzat giriyor. Ekip, kurucunun uzun süredir tanıdığı mühendis arkadaşlarından oluşuyor. (Not: "4 kişilik ekip" / "Dördümüz" ifadesi eski, doğru değil — bkz. docs/mock-data-todo.md.)

**Hedef kitle (öncelik sırasıyla)**
1. Yatırımcı — "bu ekip gerçekten ürün çıkarabiliyor" demeli
2. Hastane / laboratuvar
3. Distribütör
4. Üniversite / araştırmacı

**Sayfanın tek işi:** Ziyaretçiyi, doktor kurucunun ve mühendis arkadaşlarından oluşan bu ekibin bir cihazı mekaniğinden uygulama yazılımına kadar uçtan uca yapabildiğine ikna etmek ve talep formunu doldurtmak.

**Sitenin konusu tek bir ürün değil, kabiliyettir.** Yatırımcının satın aldığı şey bir cihaz değil, ürün çıkarabilme yeteneğidir. Ürünler bunun kanıtı olarak durur, sitenin merkezi olarak değil.

---

## Ana konsept: tek sürekli çizgi

Logodaki meander (Yunan anahtarı) motifi, dik açılarla katmanlar arasında kıvrılan **tek bir sürekli çizgidir**. Sitenin tüm yapısı bundan türer.

Sayfayı baştan sona tek bir SVG path kat eder. Sol rail'de durur, scroll ile DrawSVG kullanılarak çizilir, her bölümde bir dik açıyla kıvrılıp bir sonraki katmana geçer:

```
MEKANİK  →  ELEKTRONİK  →  GÖMÜLÜ YAZILIM  →  UYGULAMA  →  SAHA
```

Bu çizgi hem navigasyon, hem ilerleme göstergesi, hem de şirketin ne yaptığının anlatımıdır. **Sayfanın hatırlanacak tek şeyi budur. Bütün cesareti buraya harca; geri kalan her yer sakin ve disiplinli kalsın.**

Bu bir jenerik "stack diyagramı" değil — markanın kendi logosundan türetilmiş, başka hiçbir şirkete uymayan bir yapı. Yeni ürün eklendiğinde metafor bozulmaz.

### Bölüm akışı

```
HERO            ne yaptığımızı düz cümleyle söyler, meander çizilmeye başlar
KATMANLAR       mekanik → elektronik → gömülü → uygulama → saha
ÜRÜNLER         eşit ağırlıkta, veri odaklı, genişleyebilir (aşağıya bak)
HAKKIMIZDA      şirket hikâyesi
EKİP            4 portre
REFERANSLAR     yalnızca gerçek referans varsa; yoksa bölüm hiç render edilmez
KARİYER         kısa
İLETİŞİM        talep formu
```

---

## Ürünler bölümü — mimari olarak en önemli kısım

Ürünler **eşit ağırlıktadır**. Hiçbiri hero'yu ele geçirmez. Yeni ürünler eklenecek, o yüzden bu bölüm veri odaklı ve genişleyebilir olmak zorunda.

Her ürün `content/products/<slug>.json` içinde tanımlanır. Bileşen bu dosyalardan render edilir. **Üçüncü ürün eklemek = bir JSON dosyası + görseller. Kod değişikliği gerekmemeli.**

```ts
type Product = {
  slug: string
  order: number
  status: 'available' | 'in-development'
  interaction: 'turntable' | 'deepzoom' | 'gallery'
  layers: Array<'mekanik' | 'elektronik' | 'gomulu' | 'uygulama'>  // hangi katmanları içeriyor
  assets: { ... }
  // metin alanları content/tr.json ve en.json içinde, slug ile eşleşir
}
```

`interaction` alanı hangi bileşenin yükleneceğini belirler. Her ürün doğasına uygun **tek bir** etkileşim alır:

| interaction | Bileşen | Kime uygun |
|---|---|---|
| `turntable` | ScrollTrigger scrub ile dönen görsel sekansı | Fiziksel cihaz |
| `deepzoom` | OpenSeadragon, scroll ile 2×→40× | Görüntüleme yazılımı |
| `gallery` | Sade ekran görüntüsü galerisi | Diğer / varlığı az olan ürün |

Bilinmeyen `interaction` değeri gelirse `gallery`'ye düş, hata verme.

`layers` alanı ürün kartında meander çizgisinin hangi parçalarının vurgulanacağını belirler — böylece her ürün, üstteki katman anlatısına görsel olarak bağlanır. Bu bağ sitenin tezini kanıtlayan şeydir: aynı ekip, farklı katman kombinasyonları.

### Şu anki ürünler

**1. Laboratuvar su banyosu** — `status: available`, `interaction: turntable`, `layers: [mekanik, elektronik, gomulu]`
Piyasaya çıkmış, satılabilir durumda.

**2. Dijital patoloji yazılımı** — `status: in-development`, `interaction: deepzoom`, `layers: [uygulama]`
Whole-slide image (WSI/SVS) görüntüleme, annotation, vaka yönetimi. Geliştirme aşamasında.

`status: in-development` olan her ürün görünür bir "Geliştirme aşamasında" rozeti taşır. Bu rozet gizlenemez, küçültülemez, opsiyonel değildir.

Yan yana duran bir dönen cihaz ve bir zoom'lanan doku, "hem donanım hem yazılım yapıyoruz" cümlesini yazmadan kanıtlar. İki etkileşimin görsel simetrisini koru.

---

## Stack

- **Next.js (App Router) + TypeScript strict**
- **Tailwind CSS v4** — design token'lar CSS değişkeni olarak, `@theme` içinde
- **pnpm**
- **next-intl** — TR (varsayılan) / EN, `/tr` ve `/en` prefix'li
- **GSAP + @gsap/react** — ScrollTrigger, SplitText, DrawSVG. Hepsi ücretsiz, public `gsap` npm paketinden gelir. `.npmrc`'ye GreenSock auth token'ı **yazma**, Club GSAP üyeliği önerme.
- **Lenis** — smooth scroll, root layout'ta global
- **motion** — sadece UI (nav, modal, form durumları). Scroll animasyonu GSAP'in işi, karıştırma.
- **OpenSeadragon** — yalnızca `deepzoom` etkileşimli ürünlerde, lazy yüklenir
- **Vercel** — hosting. GoDaddy'de sadece domain duruyor, DNS Vercel'e yönlendirilecek.
- **Resend + Zod** — iletişim/talep formu, `app/api/contact/route.ts`

### İçerik
CMS yok. Metinler `content/tr.json` ve `content/en.json` içinde, ürün tanımları `content/products/*.json` içinde. Hepsi TypeScript tipiyle doğrulanır; bir dilde olup diğerinde olmayan anahtar build'i kırmalı. İleride Sanity'ye taşınabilmesi için içeriği düz metin tut, JSX gömme.

### Kurulacak skill/plugin
```
/plugin install frontend-design@claude-plugins-official
/plugin marketplace add greensock/gsap-skills
```
Ayrıca Context7 MCP (sürüme özgü doküman) ve Chrome DevTools MCP (render doğrulama + performans ölçümü).

---

## Design tokens

Kesindir. Yeni renk uydurma, yeni font ekleme.

```css
@theme {
  --color-ink:        #10142B;  /* metin, koyu bölüm zemini */
  --color-ahtapot:    #3E52E0;  /* marka mavisi, logodan */
  --color-periwinkle: #93A4F4;  /* meander deseni, gradyan üst durağı */
  --color-eosin:      #E0518A;  /* AKSAN — az kullan */
  --color-slide:      #F1F3F7;  /* zemin, soğuk lam camı beyazı */
  --color-steel:      #737A8C;  /* ikincil metin */
}
```

**Eosin (`#E0518A`) H&E patoloji boyamasının gerçek rengidir.** Sadece şu üç yerde: annotation poligon çizgileri, klavye focus halkası, aktif/seçili durum. Buton dolgusu, başlık rengi veya gradyan olarak kullanma.

Tema: aydınlık varsayılan, manuel toggle var. Koyu temada zemin `--color-ink`, metin `--color-slide` — aynı token seti ters çevrilir. Ayrıca `deepzoom` etkileşimli ürün bloğu, tema ne olursa olsun kendi içinde koyu zeminde durur; gerçek patoloji viewer'ları koyu arayüzlüdür, doku öyle okunur.

### Tipografi

| Rol | Font | Kullanım |
|---|---|---|
| Display | **Archivo** (variable, genişlik ekseni) | Başlıklar. Genişletilmiş, 600 ağırlık. |
| Gövde | **Manrope** | Paragraf, liste, buton |
| Veri | **JetBrains Mono** | Teknik değerler, katman etiketleri, form etiketleri, eyebrow'lar |

Üçü de `next/font/google`, `subsets: ['latin', 'latin-ext']` — **latin-ext zorunlu**, Türkçe ğ ş ı İ ç ö ü glifleri oradan gelir.

Mono yüzü "cihaz ekranı" hissini taşır. Gerçek teknik değerleri mono ile setle: `±0.1 °C · 5–99 °C`, `40× · 0.25 µm/px`.

### Yasaklı liste
Inter. Mor/menekşe gradyan. Glassmorphism. `rounded-2xl` + `p-6` + `shadow-lg` üçlü kart ızgarası. Emoji ikon. Stok "iş insanları el sıkışıyor" görseli. Sebepsiz 01/02/03 numaralandırma. Jenerik 3D küre/parçacık arka planı. Katman anlatısını jenerik bir infografiğe çevirme — meander çizgisinden türemeli.

---

## Layout

- İçerik kolonu ortalanmış değil, asimetrik. Sol tarafta meander çizgisi ve hairline dikey ızgara.
- Sol rail desktop'ta kalıcı: çizgi + katman etiketleri, hem nav hem ilerleme. Mobilde üstte ince bir ilerleme çubuğuna indirgenir.
- Bölüm ayraçları meander'ın DrawSVG ile çizilen parçalarıdır. Bölüm başına bir kez, fazlası olmaz.
- Border radius 0 veya 2px. Meander dik açılıdır, yuvarlak köşe onunla çelişir. İstisna: logo ve fotoğraf maskeleri.

---

## Animasyon kuralları

**Lenis + GSAP senkronizasyonu — atlarsan ScrollTrigger kayar:**
```ts
const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```

- React tarafında **her zaman `useGSAP`**, `useEffect` değil. Selector'ları scope'la, cleanup'ı hook'a bırak.
- `gsap.matchMedia()` ile responsive ve `prefers-reduced-motion` dallanması. Reduced motion açıksa: meander tek seferde çizili görünür, ürün etkileşimleri statik postere düşer, hiçbir içerik erişilemez hale gelmez.
- Her bölüme animasyon koyma. Orkestre edilmiş tek bir sistem (meander) dağınık efektlerden iyi iş görür.
- Hover mikro-etkileşimleri 150–250ms. Bölüm reveal'ları 400–600ms.

---

## Performans bütçesi

Pazarlık konusu değil. Chrome DevTools MCP ile ölç, tahmin etme.

- LCP < 2.5s, CLS < 0.1, INP < 200ms — 4G throttle, mid-tier mobil
- Scroll orta seviye telefonda 60fps korumalı
- OpenSeadragon ve turntable kare setleri `dynamic(..., { ssr: false })` + IntersectionObserver, sadece viewport'a girince yüklenir
- Mobilde: turntable 36 → 12 kare, deepzoom yerine statik poster + "Demoyu aç" butonu
- Görseller `next/image`, AVIF/WebP, açık `sizes`
- Toplam JS < 200KB gzip (OpenSeadragon hariç, o lazy)

## Erişilebilirlik

- Klavyeyle tüm sayfa gezilebilir, focus halkası görünür (`--color-eosin`)
- Scroll-jack yok — kullanıcı scroll kontrolünü asla kaybetmez
- Renk kontrastı WCAG AA
- `lang` attribute i18n ile doğru set edilir
- Form: her input'ta `<label>`, hatalar `aria-live` ile

---

## İçerik ve dil

**Ton:** Profesyonel ama genç. Kurumsal şişkinlik yok. Kısa cümle, aktif çatı, somut ifade.

- ❌ "Sağlık teknolojilerinde yenilikçi çözümler sunarak sektöre değer katıyoruz."
- ✅ "Bir cihazın mekaniğini, elektroniğini ve yazılımını aynı odada yapıyoruz. Kurucumuz doktor."

Küçük ekip olmak saklanacak değil, kullanılacak bir şey. Yatırımcı, klinik problemi bizzat yaşayan bir doktorun cihazı mühendis arkadaşlarıyla birlikte çıkardığını görünce etkilenir; kalabalık bir ekipmiş gibi 200 kişilik dil kullanmasını görünce şüphelenir.

Buton metinleri ne olacağını söyler: "Teklif iste", "Demo talep et" — "Gönder" veya "Daha fazla" değil. Aksiyon adı akış boyunca değişmez.

Boş/hata durumları yön verir, özür dilemez.

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

Bir metin bu sınırda mı diye tereddüt edersen yaz ama işaretle, kullanıcıya sor. Sessizce iddia üretme.

### KVKK
- Formda açık rıza checkbox'ı (önceden işaretsiz) + aydınlatma metnine link
- `/kvkk` ve `/gizlilik` sayfaları — şablon üret, üstüne "hukuk kontrolünden geçmeli" notu düş
- Analytics yok, tracking cookie yok → çerez banner'ı da yok. Bilinçli sadeleştirme, ekleme.
- Form verisi Resend ile mail olarak gider, veritabanında saklanmaz

---

## Çalışma şekli

1. Kod yazmadan önce **plan sun**. Bölüm bölüm ilerle, tek seferde tüm siteyi üretme.
2. Her görsel bölümden sonra Chrome DevTools MCP ile ekran görüntüsü al, kendi çıktını eleştir, sonra devam et.
3. İçerik `content/`'ten gelir. Component içine metin veya ürün verisi gömme.
4. Placeholder kullandığında dosyada `TODO:` ile işaretle ve sonunda listele.
5. Uydurma yapma: teknik spesifikasyon, sertifika, müşteri adı, referans, sayı — verilmediyse `TODO` bırak.
6. Emin olmadığın kütüphane API'si için Context7 MCP'ye bak. GSAP için resmi gsap-skills'i kullan.
7. **Genişleyebilirliği koru.** Ürüne özel mantığı bileşene gömme; `interaction` ve `status` alanlarından türet. Üçüncü ürün bir JSON dosyasıyla eklenebilmeli.
