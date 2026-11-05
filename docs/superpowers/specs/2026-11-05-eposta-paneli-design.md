# E-posta paneli tasarımı

Durum: onaylandı (2026-11-05), aynı gün kullanıcı geri bildirimiyle genel modele
geçirildi. Aşağıda kişi/`info@` ayrımı geçen yerlerin yerine "Genel model" geçerlidir.

## Genel model (geçerli)

Tek nesne vardır: adres. Her adresin 1..N alıcısı olur; `info@`, `talep@`, `kerem@`
aynı listede, aynı kurallarla durur. Kullanıcı `info@`'ya özel alanı ("info@ alıyor")
reddetti. Tek alıcı doğrudan iletilir, ikincisi eklenince kural
`eposta-yonlendirme` Worker'ına geçer, alıcılar KV'de `adres-hedefleri` haritasında
durur. Yalnız `info@` ve `talep@` silinemez. Doğrulama bekleyen alıcı panel açılınca
kendiliğinden eklenir, "Kurulumu tamamla" adımı yoktur. Anahtar adrese bağlıdır, ama
talimat kişinin alıcısı olduğu bütün adresleri içerir. Kullanım `/emails` listesinden
sayılır, çünkü Resend kota başlıklarını okuma isteklerinde döndürmez.

Görünüm: taste-skill "Data terminal" uygulama stili, sitenin koyu renkleri ve yazı
tipleri. Alıcılar adresten çıkan dik açılı kollarla gösterilir (logodaki çizgi).

Durum: ilk sürüm (2026-11-05). Kullanıcı e-posta kişi işlemlerini Claude olmadan
`admin.ahtapot.ink` üzerinden yapmak istiyor.

## Kapsam

Panel beş iş yapar: kişi eklemek, kişi çıkarmak, `info@` alıcılarını seçmek, Resend
anahtarı üretip yenilemek, kotayı ve işlem kaydını göstermek.

Kapsam dışı: kişinin Gmail ayarı (Google yalnız kurumsal hesaplarda otomatik
yaptırıyor), ortak gelen kutusu, alan adı ve DNS işlemleri, site içeriği.

## Mimari

Siteden ayrı bir Worker: `workers/panel/`, ad `ahtapot-panel`, alan adı
`admin.ahtapot.ink`. `workers.dev` ve önizleme adresleri kapalı. Yayını
`wrangler deploy` ile yapılır; sitenin `main` akışına bağlı değildir.

Reddedilenler: sitenin içinde `/admin` (güçlü anahtarlar herkese açık Worker'da
durur), Cloudflare Access (ücretsiz planda da ödeme bilgisi ister).

Bağımlılık yok: sade JavaScript modülleri, sunucuda üretilen HTML, küçük bir kopyalama
betiği. Testler `node:test` ile.

| Birim | İş |
|---|---|
| `validate.js` | Form alanlarını doğrular |
| `auth.js` | Google girişi, imzalı oturum çerezi, izinli adres kontrolü |
| `cloudflare.js` | Email Routing kuralları ve hedef adresler |
| `resend.js` | Anahtar listeleme, üretme, silme; kota başlıkları |
| `store.js` | KV: `info@` alıcıları, bekleyen kişiler, işlem kaydı |
| `people.js` | İş kuralları; yalnız yukarıdaki üçünü kullanır |
| `views.js`, `assets.js` | HTML, CSS, kopyalama betiği |
| `index.js` | Yönlendirme ve erişim kontrolü |

## Veri

Kişi listesi tutulmaz. Her açılışta Cloudflare kurallarından ve Resend anahtar
listesinden türetilir; böylece panel gerçek durumdan kopmaz. Bir kişinin anahtarı
`gmail-<yerel ad>` adıyla bulunur (`gmail-kerem`, `gmail-mustafa` zaten bu biçimde).
Görünen ad kuralın `name` alanındadır.

KV'de üç değer vardır: `info-hedefleri` (alıcı listesi), `bekleyenler` (doğrulama
bekleyen kişiler), `islem-kaydi` (son 50 işlem).

## Akışlar

**Ekleme:** hedef adres yoksa Cloudflare'de oluşturulur, kişiye doğrulama maili gider;
kişi `bekleyenler`e yazılır. Cloudflare doğrulanmamış adrese kural açtırmadığı için
işlem burada durur. Adres doğrulanınca "Kurulumu tamamla": kural → `info@` listesi →
anahtar → bekleyenden silme. Her adım var olanı atlar, yeniden denenebilir. Anahtar bir
kez, hazır Gmail talimatıyla birlikte gösterilir ve hiçbir yerde saklanmaz.

**Çıkarma:** onay sayfası → anahtar → `info@` listesi → kural → hedef adres. Gmail
başka bir kuralda veya bekleyen kişide kullanılıyorsa `info@` listesinde ve hedef
adreslerde kalır.

**Anahtar yenileme:** yenisi üretilir, sonra eskisi silinir.

## Kurallar

- `info@` ve `talep@` panelden değiştirilemez, silinemez.
- `info@` listesindeki son alıcı çıkarılamaz.
- Yerel ad küçük harf, rakam ve `.`, `_`, `-`; Türkçe karakter yok; en çok 40 karakter
  (Resend anahtar adı sınırı 50).
- `admin`, `postmaster`, `abuse` gibi ayrılmış adlar açılamaz.
- Hedef adres `@ahtapot.ink` olamaz (döngü).

## Güvenlik

- Giriş Google OAuth ile, yalnız `ADMIN_EMAILS` secret'ındaki adreslere açık.
- Oturum HMAC imzalı, `__Host-` önekli, `HttpOnly`, `Secure`, `SameSite=Lax`, 12 saat.
- Tüm POST istekleri `Origin` kontrolünden geçer.
- Yapılandırma eksikse panel kapalı kalır (503).
- CSP satır içi betik ve stile kapalı; yanıtlar `no-store` ve `noindex`.
- Cloudflare anahtarı yalnız Email Routing kuralları ve adresleri yazabilir. Resend
  anahtarı Full access olmak zorunda (anahtar üretmek için).

## `info-yonlendirme` değişikliği

Worker alıcıları `PANEL_KV` içinden okur. KV okunamaz ya da liste boşsa koddaki sabit
listeye düşer; posta kaybolmaz. KV değişikliği en çok bir dakikada yayılır.

## Test

Birim testleri: doğrulama, oturum ve Google yanıtı, iş kuralları, erişim kontrolü.
Canlı deneme: geçici `deneme@ahtapot.ink` ile ekle, mail al, çıkar. `info@` Worker'ı
yayınlandıktan sonra deneme maili atılır.
