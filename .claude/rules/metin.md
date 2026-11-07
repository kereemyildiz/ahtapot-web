---
paths:
  - "content/**/*.json"
---

# Site metni yazım kuralları

Kullanıcı sitedeki yazıları "AI slop" buldu. Sorun kelimeden çok cümle kalıbındaydı. Metin yazarken ya da düzeltirken:

## Kalıplar
- "X'ten Y'ye kadar" sahte aralık yok ("3B modelden teknik resme ve prototipe kadar"). Gerçek bir aralık (2×–40×, 44–50 °C) serbest.
- Üçlü sıralama alışkanlığı yok. Gerçekten üç şey yoksa üç sayma.
- TR'de noktalı virgülle cümle yapıştırma yok, iki cümleye böl. (Kalan istisna: `kvkk` ve `privacy` hukuk taslakları.)
- İki noktayla "açıklama" kalıbı yok ("…geliştiriyoruz: …", "farkı amacındadır: …"). Etiket ve veri girişi ("Su az: …", "56–58 °C olan parafin: 44–50 °C") serbest.
- Cümle altındaki madde listesini tekrar etmez. Listenin söylemediğini (neden, nasıl) söyler.
- Aynı bilgi aynı bölümde birden çok kez geçmez (ör. Hakkımızda'da yerlileştirme yalnız giriş paragrafında).
- Yan yana duran cümleler (beş yetkinlik gibi) farklı uzunlukta ve farklı yapıda olur.

## Kelime
- Her şirkete uyan genel ifade yok: "yanında olmak", "tek muhatap", "ihtiyaca göre kurgulamak", "baştan gözeterek", "değer katmak".
- Edilgen/öznesiz "-ır/-ilir" yerine etken çatı ("Görüntüleyici ölçümleri … hesaplar"). Soyut isim (ihtiyaç, süreç, bakış açısı, sorumluluk) yerine somut şey (çizim, kaynak kod, parça, hazne).
- Çeviri kokan kalıp yok: "görünür kılar", "dönüş yapmak" (→ "yanıt vermek"), "kurgulamak", "Arayüzden" (→ "Ekranlar"), EN "Layers inside".
- Tezi cümleyle iddia etme, göster ("Aynı ekipten iki ürün…" yerine katman çiplerine yönlendir). Sayıya bağlı cümle yazma; üçüncü ürün eklenince yanlış kalır.
- "Uçtan uca" yalnız `hero.title` ve `footer.tagline`'da.
- Uzun tire, "âdeta", "yadsınamaz", abartı sıfatı, emoji yok.

## İngilizce
- TR'den çevirme, anlamdan yeniden yaz. Cümle yapısı TR'nin aynası olmasın.
- İngiliz yazımı: organised, aluminium, centre, colour, modelling, synchronised, localisation.
- Kurucu için zamir yok; gerekirse "Dr. Yılmaz".

## Değişmeyenler
- Bölüm başlıkları (Çözümler, Ürünler, Hakkımızda, İletişim / Solutions, Products, About, Contact) ve buton metinleri ("Görüşme talep edin", "Teklif isteyin", "Demo talep edin").
- "Siz" hitabı. İletişimdeki "iki iş günü" taahhüdü.
- Mevzuat (CLAUDE.md → "Mevzuat kısıtları"): tanı ya da klinik performans iddiası yok, sahip olunmayan sertifika yok, simülatörün "temsili" notu anlamıyla kalır, "geliştirme aşamasında" ifadeleri korunur. Yeni olgu, sayı ya da iddia ekleme.
