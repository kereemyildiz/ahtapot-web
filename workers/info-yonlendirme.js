// Cloudflare Email Worker: info@ahtapot.ink'e gelen e-postaları birden fazla
// adrese iletir. Email Routing'de bir adres yalnız tek hedefe yönlenebildiği
// için gerekli. Panelde "info-yonlendirme" adıyla yayında; bu dosya kaydı.
// Değişiklik: Workers & Pages → info-yonlendirme → Edit code → yapıştır → Deploy.
// Her hedef Email Routing → Destination addresses altında "Verified" olmalı.
const HEDEFLER = ["a.keremyildiz99@gmail.com", "jrsweet8@gmail.com"];

export default {
  async email(message) {
    // Biri başarısız olursa (ör. henüz doğrulanmamış adres) diğeri yine gider.
    const sonuclar = await Promise.allSettled(HEDEFLER.map((adres) => message.forward(adres)));
    sonuclar.forEach((sonuc, i) => {
      if (sonuc.status === "rejected") console.error("İletilemedi:", HEDEFLER[i], String(sonuc.reason));
    });
  },
};
