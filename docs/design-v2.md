# Tasarım v2 — "Karanlık oda"

Branch: `redesign/v2`. Önceki tasarımdan yalnız altyapı alındı (i18n, içerik
şeması, ürün JSON'ları, iletişim API'si, deepzoom verisi); görsel dil sıfırdan.
Kurallar ve token'lar artık `CLAUDE.md`'de; bu dosya kararların gerekçesi.

## Fikir

Sayfa baştan sona tek bir mavi-siyah zeminde akar; cihazlar, çizimler ve
fotoğraflar bu zeminde ışıklı sergi objeleri gibi durur. Logodaki meander
işareti bir ahtapottur: bir baş, dört kol. Hero'da kollar dört disipline
uzanır; aynı çizgi yetkinlikler bölümünde ilerleme göstergesi olur.

## Kullanılan skill'ler

- **ui-ux-pro-max** (skill-issue.in): tasarım sistemi sorgusu, erişilebilirlik ve
  hareket kuralları. Önerdiği teal/yeşil "medikal" paleti alınmadı.
- **taste-skill** (skill-issue.in): "The dark room" sanat yönü; tipografi kurası
  Unbounded / Onest (başlık fontu sonradan Instrument Sans oldu). Ev kurallarından: dolu bölümler, gerçek görseller, eşit
  kenar boşlukları, her bölümde başlık, eyebrow yok.
- **gsap-skills** (resmi): useGSAP, ScrollTrigger, matchMedia, reduced motion.
- **dataviz**: simülatör grafiği — tek eksen (sıcaklık) + ayrı güç şeridi,
  lejant + doğrudan etiket, hover çizgisi; renk çifti doğrulayıcıdan geçti
  (CVD ΔE 29.7).

## Revizyon 2 (kullanıcı geri bildirimi)

| Geri bildirim | Yapılan |
|---|---|
| Logo maviydi, sitede değil | İşaret mavi degrade (`LogoMark`), yazı düz mavi (`public/brand/wordmark.png`); su banyosu ön panelinde tam logo |
| Dev "ahtapot" yazısı alakasız | Hero ve footer'dan kaldırıldı |
| Metinler profesyonel değil | Tüm metinler "siz" diliyle, kurumsal tonda yeniden yazıldı (TR + EN) |
| Hero daha genel olsun, su banyosu bir yerde kalsın | Hero: logodaki ahtapot ve dört kolu (HeroNetwork). Su banyosu modeli ürün simülatörüne taşındı, "İçini gösterin" ile hâlâ katmanlarına ayrılıyor |
| Dev fiiller (Kodla, Lehimle) yerine daha cool bir şey | Sabit sahne: her katmanın çizimi kendini çiziyor (izometrik gövde, kart yerleşimi, kontrol yanıtı, işaretleme, saha) |
| Patoloji görselinde scroll sayfayı kaydırıyor, zoom yok | Tıklayınca tekerlekle zoom (`data-lenis-prevent`), Ctrl/⌘ her zaman; araç çubuğu, 2×–40× objektif düğmeleri, işaretleme aç/kapa, tam ekran; masaüstünde kendiliğinden yüklenir |
| Su banyosunu interaktif çalıştıralım | Simülatör: ayar sıcaklığı, kapak, su seviyesi; PI kontrolcü + güvenlik kilidi + ısı kaybı modeli; canlı ekran, sinyal yolu, grafik |
| Şehir İstanbul | İçerik ve CLAUDE.md güncellendi |

## Revizyon 3 (eleştirel tur: "her bileşeni daha iyi yap")

| Sorun | Yapılan |
|---|---|
| Hero modüllerinde jenerik clip-art ikonlar | Yetkinlik çizimlerinin küçükleri: açılıp kapanan gövde, sinyal akan kart, ışını ilerleyen kontrol yanıtı, kendini çizen işaretleme; yalnız etkin modül çalışır |
| Hero paneli durağan | Logodaki kancalardan türeyen desen; imleç çevresinde belirir (yalnız fare, CSS değişkeniyle, React render yok) |
| Fotoğraflar karanlık oda paletini bozuyor, çizimlerle yarışıyor | `photo-duo`: gri ton × periwinkle çarpımı. Yetkinlik, ekip ve arşiv fotoğrafları aynı mavi duotone'da; atıf metnine "renkleri düzenlenmiştir" eklendi |
| Yetkinlik çizimleri çizildikten sonra donuyor | Mekanik: kaydırdıkça toplu hâlden açılmış görünüşe ayrılır (scrub). Gömülü: osiloskop ızgarası, eğride ilerleyen ışın, kontrol döngüsünün izlediği satır vurgusu (kilit dalı atlanır). Saha: zaman çizelgesinde ilerleyen işaret |
| Uygulama görseli bulanık | `sizes` kırpılmış genişliğe göre (görüntü kutunun ~2,1 katı genişlikte gösteriliyordu) |
| Simülatör açılışta "Beklemede", grafik düz | İlk kez yarısı görününce kendiliğinden çalışır; kullanıcı önce dokunduysa ya da hareket azaltılmışsa başlamaz |
| Su banyosu modeli düz gri kutu | Üstten sergi ışığı (dik yüzlerde degrade), arkada mavi ışık konisi, zeminde ışık havuzu + temas gölgesi |
| Patoloji görüntüleyicisinde solda siyah şerit | Doğal büyütme 41,22×: 5×'te görüntü kutudan dardı. Açılış yakınlaşması en az kutuyu dolduracak kadar |
| Görüntüleyici gerçek üründen yoksun | Gerçek AhtaPatoloji arayüzündeki gibi mini harita (masaüstü) ve gerçek µm/px'ten hesaplanan ölçek çubuğu |
| Hakkımızda: parlak gri 1850 fotoğrafı, yanında boşluk | "Camdan ekrana" perdesi: 1850 preparatları ↔ gerçek WSI kesiti; kaydırdıkça dijital taraf büyür, işaretleme kendini çizer |
| Mobilde adım içi çizimler hiç çizilmiyordu | "Çizildi" kümesi `useRef`'teydi; StrictMode'un ikinci kurulumu çizimleri gizleyip yeniden çizmiyordu. Küme artık efektin içinde |

## Revizyon 4 (kullanıcı geri bildirimi)

| Geri bildirim | Yapılan |
|---|---|
| Footer'daki uzun lisans metnini kaldır | Footer'da yalnız "Görsel kaynakları" bağlantısı; atıflar `/kaynaklar` sayfasında (CC BY-SA atıf zorunluluğu). Kullanılmayan üç fotoğraf silindi, iki atıf kaldı |
| Ekibi kaldır, yalnız kurucu | Ekip bölümü ve nav bağlantısı kalktı. Hakkımızda'da kurucu bloğu: ahtapotun başında tıp artısı (baş hekim, kollar mühendislik) |
| Hero efekti yalnız ilk açılışta | Giriş çizimi hero'ya geri dönünce ve logonun başına gelince yeniden oynar |
| "Tek bir mühendislik ekibiyle" saçma | Yeni cümle: "Klinikte tarif edilen bir ihtiyacı sahada çalışan bir cihaza dönüştürüyoruz: gövdesinden devresine, kodundan ekranına." |
| Logoya "Tıbbi Teknolojiler" | Wordmark altında küçük, büyük harf, periwinkle satır (`company.brandSub`) |
| Uygulama görseli güzel değil | Kırpılmış tek ekran yerine üç gerçek AhtaPatoloji ekranı, sırayla öne gelen pencereler |
| Saha görseli sıkıcı, hareketli olsun | Cihazın çevresinde dönen döngü: işaret durağa gelince o adım oynar (yerleştirme köşeleri, ekranda adımlar, onay, ilerleme çubuğu) |
| Su banyosu grafiği karışık; kontroller modelde olsun; başka yetenekler | Büyük grafik ve sinyal yolu kalktı, köşede küçük iz. Ön paneldeki −/+/güç/zamanlayıcı gerçek düğmeler; kapağa tıklayınca açılır. Sirkülasyon pompası (kapatınca sensör geç algılar, ayar aşılır) ve zamanlayıcı eklendi |
| AhtaPatoloji'ye poligon, seçim, mesafe | Gezin/seç, poligon, dikdörtgen, mesafe; alan ve uzunluk gerçek µm/px'ten; seçileni sil, tümünü temizle; Enter/Esc/Delete |
| 1850 ↔ bugün karşılaştırması saçma | Bugünkü pratik ↔ dijital: aynı gerçek kesit, solda mikroskop okülerinden (dairesel, temsili), sağda AhtaPatoloji'de (işaretleme + gerçek ölçek) |
| Diğer bölüm girişleri daha etkili | Her bölüm: logodaki baş ve kanca kendini çizer, çizgi uzanır (`SectionRule`); başlık kelime kelime yükselir (`Words`); giriş paragrafı okudukça yanar |

Bu turda bulunan hata: Chrome CSS'teki `stroke-dashoffset`'i `pathLength`'e göre ölçeklemiyor; yollardaki darbeler (hero kolları, devre izleri, osiloskop ışını) yolun yalnız sonunda dolaşıyordu. `lib/svgPath.ts` gerçek uzunluğu veriyor.

## Revizyon 5 (kullanıcı geri bildirimi)

| Geri bildirim | Yapılan |
|---|---|
| Bellek şişmesinin sebebi | Webpack dev her yeniden derlemede büyüyordu (12 derlemede 1,3 → 2,6 GB). `dev` Turbopack'e geçti (0,46–0,56 GB). Sayfanın JS belleği tam kaydırma turlarında sabit: sızıntı yok |
| Performans | Ekran dışındaki sonsuz CSS animasyonları `useOffscreenPause` ile duruyor (hero görünürken çalışan animasyon 21 → 7); araç ekranlarının JS döngüleri yalnız sahne etkin ve görünürken çalışıyor |
| Mekanik/elektronik/gömülü/saha görselleri çok basit | Her biri bir mühendislik aracının çalışma ekranı: CAD (gerçek 3B izdüşüm, gizli kenarlar, ölçüler, kesit), kart tasarımı (ayak izleri, 45° izler, net vurgusu, kural denetimi), IDE (adım adım kod, izleme, grafik, terminal; canlı PI modeli), saha (üç farklı tıbbi cihaz, servis hatları, kurulum/eğitim/kalibrasyon/güncelleme) |
| Biz tıbbi cihaz üreticisiyiz, odak yerlileştirme | Hero cümlesi, Hakkımızda ve olgular yerlileştirme odağıyla yeniden yazıldı; saha sahnesi tek bir su banyosu değil, farklı tıbbi cihazlar |
| Kurucu Dr. Mustafa Can Yılmaz, telefon | İçeriğe işlendi; telefon iletişim bölümünde ve footer'da |
| Karşılaştırma yalnız kaydırınca hareket ediyor; neden Hakkımızda'da | AhtaPatolog ürününün altına taşındı (`assets.compare`); fareyle üzerine gelince ayraç imleci izliyor, dokunmatikte sürükleniyor, klavyeyle kayıyor |
| Kurucu görselindeki sağlık işareti | Stetoskobun hortumu devre izine dönüşüp çipe bağlanıyor; izden sinyal geçiyor |
| "gövdesinden devresine, kodundan ekranına" | Kaldırıldı |
| Yetkinlikler giriş paragrafı gereksiz | Kaldırıldı |
| Hakkımızda zayıf, başlık bile yok | Büyük "Hakkımızda" başlığı, yerlileştirme metni, olgular, üç ilke, kurucu |
| AhtaPatoloji → AhtaPatolog | Her yerde değişti |

Bu turda bulunanlar: CAD modelinde kamera gövdenin arkasına bakıyordu (ön panel ayrıntıları görünmüyordu); IDE'de `truncate` kod girintisini yutuyordu; mobilde karşılaştırma etiketleri çakışıyordu. Hepsi düzeltildi. Mekanik ve elektronik sahnelerden fotoğraflar kalktığı için sitede açık lisanslı görsel ve atıf zorunluluğu kalmadı.

## Ölçümler (production build, mobil, Fast 4G, 4× CPU)

- Revizyon 5: LCP 1,28 s · CLS 0 (önceki tur 1,1 s)
- İlk JS (gzip, modern tarayıcı, `noModule` polyfill hariç): ~204 KB (önceki
  tur ~210 KB). Bütçe 200 KB; ~130 KB'ı React + Next.js tabanı. Simülatör,
  turntable, OpenSeadragon, yetkinlik araç ekranları ve karşılaştırma lazy.
