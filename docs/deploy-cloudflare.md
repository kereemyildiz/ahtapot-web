# Cloudflare'e yayın

Durum (20 Ekim 2026): **repo tarafı tamam** (paketler kurulu, build ve lint
temiz, Cloudflare çalışma zamanında yerelde doğrulandı). Kalan iş **panel
adımları** (§5): Cloudflare hesabı, GoDaddy nameserver değişikliği, secret'lar.

- Alan adı: **`ahtapot.ink`** (kök birincil, `www` köke yönlenir).
- Alan adında e-posta yok; MX kaydı korunacak bir şey yok.
- GoDaddy'de otomatik oluşturulmuş bir Website Builder sitesi var. Nameserver
  değişince alan adı ona gitmez. Silmek şart değil; yeni site yayına girdikten
  sonra, ücretli bir paketse yenilemesi kapatılabilir.

---

## 1. Neden Cloudflare

| Seçenek | Ücret | Ticari site | Not |
|---|---|---|---|
| **Cloudflare Workers + OpenNext** | Ücretsiz | Serbest | Seçilen. Kurulum işi var (adaptör + nameserver taşıma). |
| Netlify Free | Ücretsiz | Serbest | Ayda 300 kredilik katı sınır; aşılırsa site ay sonuna kadar durur. |
| Vercel Hobby | Ücretsiz | **Yasak** (kişisel, ticari olmayan) | Uygun plan Pro: koltuk başı ayda 20 $. |
| GitHub Pages | Ücretsiz | Gri alan | Statik dışa aktarım: `proxy.ts`, `/api/contact`, görsel optimizasyonu çalışmaz. |

- Alan adı **GoDaddy'de kayıtlı kalır.** Yalnız nameserver'lar Cloudflare'e
  geçer. Bu adım şart: Worker'a özel alan adı bağlamak için alan adının aktif
  bir Cloudflare zone'u olması gerekiyor. Ücretsiz planda CNAME ile bağlama yok.
- Maliyet: 0 ₺ (GoDaddy'deki alan adı yenilemesi hariç, o değişmez).

| Kaynak | Ücretsiz sınır | Bu site |
|---|---|---|
| Worker istekleri | Günde 100.000 | Statik dosyalar (JS, CSS, görsel, patoloji karoları) bu sayıya girmez |
| Worker boyutu | 3 MiB (gzip) | **1,72 MiB** webpack / **1,83 MiB** Turbopack (ölçüldü) |
| Statik dosya | Sürüm başına 20.000, dosya başına 25 MiB | 941 dosya, 29 MB |
| CPU | İstek başına 10 ms | Sayfalar önceden üretilmiş; yayından sonra panelden ölçülmeli (§6) |
| Görsel optimizasyonu | Ayda 5.000 benzersiz dönüşüm | Birkaç yüz. Aşılırsa yeni dönüşüm hata verir, **ücret çıkmaz** |
| Resend | Ayda 3.000, günde 100 e-posta | Talep formu |

Sınır aşılırsa Cloudflare kendiliğinden ücretli plana geçirmez; Workers Paid
ayda 5 $'dır ve elle seçilir.

---

## 2. Kararlar

| Konu | Karar | Neden |
|---|---|---|
| `src/proxy.ts` | **Olduğu gibi kalır** | OpenNext 1.20.3'ten beri Node middleware'i (`proxy.ts`) destekliyor. Build "deneysel" uyarısı veriyor; yerel testte `/` → `/tr` ve dil algılama (`Accept-Language: en` → `/en`) çalıştı. Edge'e taşıma ya da Redirect Rule gerekmedi. |
| Next.js sürümü | **16.3.2 → 16.4.2** (zorunlu) | `@opennextjs/cloudflare@1.20.12` peer bağımlılığı `>=16.4.1`. 16.4.2 ile build temiz geçti. |
| Ürün sayfası | `dynamicParams = false` | §3.3'e bak. |
| Önbellek | Static assets incremental cache | Site tamamen statik (ISR yok). R2, KV, kuyruk gerekmez. |
| `next/image` | Cloudflare Images binding | Ölçüldü: `logo-full.png` 185 KB → 640 px'te 58 KB WebP. |
| Ortam değişkenleri | Üçü de panelde **Secret** | Repo public; gelen kutusu adresi repoya yazılmaz. Secret'lar her deploy'da korunur. |
| Build yeri | Cloudflare Workers Builds (Linux CI) | OpenNext Windows'u tam desteklemiyor (§4). |
| `initOpenNextCloudflareForDev` | **Eklenmedi** | Yalnız kodda binding okunuyorsa gerekli; bu projede yok. `next dev` olduğu gibi kalır. |

---

## 3. Repo değişiklikleri

### 3.1 Yapıldı

| Dosya | Değişiklik |
|---|---|
| `wrangler.jsonc` | Yeni. Worker adı `ahtapot-web`, `nodejs_compat`, statik varlıklar, Images binding, Workers Logs. Alan adı satırları TODO (alan adı belli değil). |
| `public/_headers` | Yeni. `/_next/static/*` 1 yıl `immutable`; `/deepzoom/*` 30 gün. |
| `.dev.vars.example` | Yeni. Yerel Cloudflare önizlemesi için. |
| `.node-version` | Yeni, `22`. CI'daki Node sürümü yerel makineyle aynı olsun diye. |
| `.gitignore` | `.open-next/`, `.wrangler/`, `.dev.vars*`, `cloudflare-env.d.ts` |
| `tsconfig.json`, `eslint.config.mjs` | `.open-next`, `.wrangler` hariç tutuldu. Yerel build çıktısı tip kontrolüne ve lint'e karışmaz. |
| `src/app/api/contact/route.ts` | İstemci IP'si önce `cf-connecting-ip`'den okunur. Hız sınırı artık gerçek IP'ye göre çalışıyor. |
| `src/app/[locale]/urunler/[slug]/page.tsx` | `export const dynamicParams = false` (§3.3). |

### 3.2 Paketler ve yapılandırma (tamamlandı)

Paralel geliştirme bitince tek seferde uygulandı. Sıra önemliydi:
`open-next.config.ts` paket kurulmadan eklenirse `next build`'in tip kontrolü
kırılır.

1. `pnpm-workspace.yaml` → `allowBuilds` altına ekle:
   ```yaml
     esbuild: true
     workerd: true
   ```
   Eklenmezse pnpm 11 kurulumu `ERR_PNPM_IGNORED_BUILDS` ile **hata koduyla**
   biter. CI'da da aynısı olur ve build başlamaz.
2. Paketler (sürümler bilerek sabit; hepsi pnpm'in "en az bir günlük" yayın
   kuralını geçiyor, `minimumReleaseAgeExclude` gerekmiyor):
   ```bash
   corepack pnpm add next@16.4.2 @opennextjs/cloudflare@1.20.12
   corepack pnpm add -D eslint-config-next@16.4.2 wrangler@4.151.2
   ```
3. `package.json` script'leri:
   ```json
   "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
   "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
   "upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
   "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
   ```
   `opennextjs-cloudflare build`, `build` script'ini çağırır. Webpack ya da
   Turbopack: ikisi de çalışıyor (§8.1).
4. Kökte `open-next.config.ts`:
   ```ts
   import { defineCloudflareConfig } from "@opennextjs/cloudflare";
   import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

   export default defineCloudflareConfig({
     incrementalCache: staticAssetsIncrementalCache,
     enableCacheInterception: true,
   });
   ```
5. `CLAUDE.md` → Stack: "Vercel — hosting" satırı Cloudflare olarak güncellenir.
6. `corepack pnpm build` ve `corepack pnpm lint` temiz geçmeli.
7. Commit → push → `main`'e merge. Cloudflare yalnız GitHub'daki kodu görür;
   şu an `redesign/v2` dalı ve yeni tasarım yalnız bu makinede duruyor.

### 3.3 `src/content/products.ts`: çalışma anında dosya okuma

Ürün JSON'ları modül yüklenirken `fs.readdirSync` + `fs.readFileSync` ile
okunuyor. Amaç: yeni ürün = yeni JSON dosyası, kod değişikliği yok. Worker'da
proje dosya sistemi yok.

- **Ölçülen sorun:** Bilinen sayfalar önceden üretildiği için etkilenmiyor.
  Ama bilinmeyen bir ürün adresi (`/tr/urunler/olmayan-urun`) sayfayı çalışma
  anında render ettiriyordu → modül yükleniyor → **500**.
- **Çözüm (uygulandı):** ürün sayfasında `export const dynamicParams = false`.
  Bilinmeyen slug render edilmeden 404 olur. Ürün ekleme kuralı değişmedi.
- **Doğrulama:** bilinmeyen slug 404 (RSC isteği de 404). Ana sayfa, ürün
  sayfaları, ön yükleme (`RSC`, `Next-Router-Prefetch`, segment prefetch)
  istekleri 200. Hepsi önceden üretilmiş dosyalardan geliyor.
- **Sınır:** İleride `products.ts`'i çalışma anında kullanan dinamik bir rota
  (ör. ürün arayan bir API) eklenirse aynı hata döner. O zaman build öncesi bir
  script, `content/products/*.json`'ı tek bir dosyada toplar ve `products.ts`
  onu statik import eder.

---

## 4. Yerel doğrulama (20 Ekim 2026)

Ana klasöre dokunmadan, çalışma ağacının bir kopyasında yapıldı. O sırada
yarım kalan değişiklikler de kopyadaydı.

| Kontrol | Sonuç |
|---|---|
| `next build --webpack` (Next 16.4.2) | ✅ 16 sayfa statik, `/api/contact` dinamik, Proxy |
| `next build` (Turbopack) | ✅ Aynı sayfalar |
| `opennextjs-cloudflare build` | ✅ İki bundler'la da (Windows'ta yalnız `nodeLinker: hoisted` ile; aşağıya bak) |
| `wrangler deploy --dry-run` | ✅ 1.761 KiB (webpack), 1.871 KiB (Turbopack) gzip; bağlantılar: ASSETS, IMAGES, WORKER_SELF_REFERENCE |
| `/` | 307 → `/tr` |
| `/` + `Accept-Language: en` | 307 → `/en` |
| `/tr`, `/en`, ürün sayfaları, `/kvkk`, `/gizlilik`, `/kaynaklar` | 200 |
| Olmayan sayfa / olmayan ürün | 404 / 404 |
| Sayfalardaki JS/CSS/font/görsel bağlantıları | 76 (webpack), 81 (Turbopack): hepsi 200 |
| Patoloji DZI + karolar (0–13. seviye) | 200, `image/jpeg` |
| `_headers` | Uygulanıyor: `/_next/static` → `immutable`, karolar → 30 gün |
| `/_next/image` | 200, `image/webp` |
| `/api/contact`: geçersiz form / bozuk JSON | 400 / 400 |
| `/api/contact`: aynı IP'den 6. istek | 429 |
| `/api/contact`: bot tuzağı (`hp`) dolu | 200, e-posta gönderilmez |
| `/api/contact`: geçerli form, secret yok | 500 `send_failed` (beklenen; secret'lar §5.5) |

Tarayıcıda görsel kontrol yapılmadı. O sırada Chrome DevTools'u başka bir
oturum kullanıyordu. Yayından sonra §6'daki listeyle yapılacak.

**Windows notu:** Varsayılan pnpm düzeninde OpenNext'in paketleme adımı
Windows'ta `Access is denied` hatasıyla kırılıyor; esbuild pnpm'in sembolik
bağlantılarını okuyamıyor. Bu Linux'ta olmaz, Cloudflare CI Linux'ta çalışıyor.
Yerel önizleme gerekirse ya WSL kullanılır ya da geçici bir kopyada
`pnpm-workspace.yaml`'a `nodeLinker: hoisted` eklenir. **Bu ayar repoya
konmaz.** Günlük kullanım için gerek de yok: her PR için Cloudflare önizleme
URL'si veriyor. Yerelde `pnpm` komutu yoksa OpenNext `pnpm build` çağrısında
durur; PATH'te `corepack pnpm`'e yönlenen bir `pnpm` kısayolu gerekir.

---

## 5. Panel adımları (hesap sahibi)

Tahmini süre: 30–45 dakika. Nameserver yayılmasını beklemek buna dahil değil.

### 5.1 GoDaddy'de hazırlık
1. GoDaddy → alan adı → **DNS**: tüm kayıtların ekran görüntüsünü al.
   Özellikle **MX** (alan adında e-posta varsa) ve **TXT** (SPF, Google/Microsoft
   doğrulamaları).
2. Aynı sayfada **DNSSEC** açıksa kapat. Açık kalırsa nameserver değişince
   alan adı çözülmez.
3. **Forwarding** (yönlendirme) tanımlıysa kaldır.

### 5.2 Cloudflare hesabı ve alan adı
1. https://dash.cloudflare.com → hesap aç.
2. **Add a domain** → alan adını yaz → **Free** planı seç.
3. Cloudflare GoDaddy'deki kayıtları tarar. Listeyi 5.1'deki ekran
   görüntüsüyle tek tek karşılaştır; eksik MX/TXT varsa elle ekle.
4. GoDaddy'nin park kayıtlarını **sil**: kök (`@`) için A kaydı ve `www`
   CNAME'i. Bunlar Worker'a bağlanırken çakışır (bir CNAME varken özel alan adı
   eklenemiyor).
5. Cloudflare iki nameserver verir (ör. `xxx.ns.cloudflare.com`). Not al.

### 5.3 GoDaddy'de nameserver değişikliği
1. GoDaddy → alan adı → **Nameservers** → **Change** → "I'll use my own
   nameservers".
2. Cloudflare'in verdiği iki adresi gir, kaydet.
3. Cloudflare'de **Check nameservers**. Aktivasyon genelde dakikalar, en
   fazla 24 saat sürer; bitince e-posta gelir.

### 5.4 Worker'ı GitHub'a bağlama
Önce §3.2'deki 7. adım (`main`'e push) tamamlanmış olmalı.

Cloudflare → **Workers & Pages** → **Create** → **Import a repository** →
GitHub'a izin ver → `kereemyildiz/ahtapot-web`.

| Alan | Değer |
|---|---|
| Project / Worker name | `ahtapot-web` (`wrangler.jsonc`'deki `name` ile aynı olmalı) |
| Production branch | `main` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Preview (non-production) command | `npx opennextjs-cloudflare upload` |
| Root directory | boş |
| Build variables | `PNPM_VERSION` = `11.22.0` |

`PNPM_VERSION` gerekli: CI'nın varsayılan pnpm'i 10.x, projenin lockfile'ı ve
`allowBuilds` ayarı ise pnpm 11'e göre. Node sürümünü `.node-version`
belirliyor (22).

İlk build birkaç dakika sürer. Sonunda `ahtapot-web.<hesap>.workers.dev`
adresinde site açılır. Alan adını bağlamadan önce buradan kontrol et.

### 5.5 Secret'lar
Worker → **Settings** → **Variables and Secrets** → **Add**. Üçünün türü de
**Secret**:

| Ad | Değer |
|---|---|
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `CONTACT_EMAIL_TO` | Talepleri alacak gerçek gelen kutusu |
| `CONTACT_EMAIL_FROM` | `Ahtapot <talep@alan-adi>`: alan adı Resend'de doğrulandıktan sonra. O zamana kadar boş bırak; kod `onboarding@resend.dev`'e düşer. |

Resend'de alan adı doğrulanmadan, test göndericisi yalnız **Resend hesabının
sahibi olan adrese** e-posta gönderebilir. Başlangıçta `CONTACT_EMAIL_TO` o
adres olursa form hemen çalışır.

### 5.6 Alan adını Worker'a bağlama
1. Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**:
   - `alan-adi` (kök)
   - `www.alan-adi`

   DNS kaydı ve SSL sertifikası otomatik oluşur.
2. `www` → kök yönlendirmesi: alan adı → **Rules** → **Redirect Rules** →
   şablon "Redirect from WWW to root" (301).

Alternatif: alan adı belli olunca `wrangler.jsonc`'deki `routes` TODO'su
doldurulur, her deploy aynı alan adlarını kodla tanımlar.

### 5.7 E-posta (önerilir)
- **Resend alan adı doğrulama:** Resend → Domains → Add → kayıtları
  **Cloudflare DNS**'e gir (GoDaddy'ye değil). Kayıtlar "DNS only" (gri bulut)
  olmalı.
- **Gelen kutusu yoksa:** Cloudflare **Email Routing** (ücretsiz) ile
  `talep@alan-adi` → kişisel posta kutusuna yönlendirilebilir.
  **Alan adında zaten e-posta varsa** (GoDaddy/Microsoft 365, Google
  Workspace) Email Routing'i açma: mevcut MX kayıtlarını değiştirir.

---

## 6. Yayından sonra kontrol listesi

- [ ] `https://alan-adi` → `/tr`; `www` → kök (301); `/en`; ürün sayfaları;
      `/kvkk`, `/gizlilik`, `/kaynaklar`; olmayan ürün 404
- [ ] Talep formu: geçerli gönderim gerçek kutuya düşüyor
- [ ] Patoloji görüntüleyicisi: karolar yükleniyor, ağ panelinde 404 yok
- [ ] Su banyosu simülatörü ve 3B model çalışıyor
- [ ] Görseller `image/webp` ya da `image/avif` dönüyor
- [ ] Worker → **Metrics**: CPU süresi istek başına 10 ms altında (proxy her
      sayfa isteğinde çalışıyor)
- [ ] Lighthouse (mobil, 4G): LCP < 2,5 s, CLS < 0,1, erişilebilirlik 100
- [ ] **KVKK:** aydınlatma metnine barındırma sağlayıcısı (Cloudflare, yurt
      dışı) ve e-posta sağlayıcısı (Resend) eklenmeli. **Hukuk kontrolü.**

---

## 7. Hız sınırı

Form şu an bellek içi sayaç + bot tuzağıyla korunuyor. Worker örnekleri sayacı
paylaşmadığı için kaba bir caydırıcı. Spam gelirse:
- Cloudflare Turnstile (ücretsiz, çerezsiz). Eklenirse KVKK metnine işlenmeli.
- Cloudflare WAF rate limiting kuralı (`/api/contact`). Ücretsiz planın kural
  sayısı panelden kontrol edilmeli.

---

## 8. Açık sorular

1. **Webpack mı Turbopack mı (`build`):**
   - `dev` script'i Turbopack'e geçirildi. Ölçüm: webpack 12 yeniden derlemede
     1,3 → 2,6 GB büyüdü, Turbopack 0,46–0,56 GB'da kaldı.
   - `build` hâlâ `--webpack`.
   - **Cevap:** OpenNext 1.20.12 Turbopack çıktısını destekliyor. İkisi de
     derlendi ve aynı testlerden geçti (§4). Fark: Worker 1,72 → 1,83 MiB,
     ikisi de sınırın altında.
   - Öneri: `build`'i de Turbopack'e (`next build`) almak. Geliştirme ile canlı
     aynı bundler'ı kullanır, "dev'de çalışıyor, build'de kırılıyor" farkı
     kalkar. Karar `package.json`'la birlikte §3.2'de uygulanır.
2. **Repo public:** bilerek mi? Workers Builds private repo ile de çalışır.
   Secret'lar repoda değil, yani public kalması bir sızıntı değil.

---

## Kaynaklar

- OpenNext Cloudflare: https://opennext.js.org/cloudflare/get-started
- OpenNext önbellek: https://opennext.js.org/cloudflare/caching
- OpenNext görseller: https://opennext.js.org/cloudflare/howtos/image
- OpenNext sürüm notları (1.20.3 Node middleware, 1.20.12 Next 16.4):
  https://github.com/opennextjs/opennextjs-cloudflare/blob/main/packages/cloudflare/CHANGELOG.md
- Next.js `dynamicParams`: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/dynamicParams.md`
- Workers limitleri: https://developers.cloudflare.com/workers/platform/limits/
- Workers Builds yapılandırması: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- Workers Builds build image (pnpm/Node sürümleri): https://developers.cloudflare.com/workers/ci-cd/builds/build-image/
- Workers özel alan adı: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Images fiyatı: https://developers.cloudflare.com/images/pricing/
- Cloudflare şartları: https://www.cloudflare.com/terms/
- Vercel adil kullanım (Hobby ticari değil): https://vercel.com/docs/limits/fair-use-guidelines
- Netlify kredi sistemi: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- Resend fiyatı: https://resend.com/pricing
