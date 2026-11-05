// Cloudflare Email Worker: info@ahtapot.ink'e gelen e-postaları birden fazla
// adrese iletir. Email Routing'de bir adres yalnız tek hedefe yönlenebildiği
// için gerekli. Alıcılar e-posta panelinden (admin.ahtapot.ink) yönetilir ve
// KV'de durur; KV okunamazsa posta kaybolmasın diye aşağıdaki listeye düşer.
// Yayın: npx wrangler deploy --config workers/info-yonlendirme.wrangler.jsonc
// Her hedef Email Routing → Destination addresses altında "Verified" olmalı.
const YEDEK_HEDEFLER = ["a.keremyildiz99@gmail.com", "jrsweet8@gmail.com"];

export async function hedefleriOku(env) {
  try {
    const hedefler = await env.PANEL_KV.get("info-hedefleri", "json");
    if (Array.isArray(hedefler) && hedefler.length > 0) return hedefler;
  } catch (hata) {
    console.error("KV okunamadı:", String(hata));
  }
  return YEDEK_HEDEFLER;
}

export default {
  async email(message, env) {
    const hedefler = await hedefleriOku(env);
    // Biri başarısız olursa (ör. henüz doğrulanmamış adres) diğeri yine gider.
    const sonuclar = await Promise.allSettled(hedefler.map((adres) => message.forward(adres)));
    sonuclar.forEach((sonuc, i) => {
      if (sonuc.status === "rejected") console.error("İletilemedi:", hedefler[i], String(sonuc.reason));
    });
  },
};
