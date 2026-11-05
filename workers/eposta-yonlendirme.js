// Cloudflare Email Worker: birden fazla alıcısı olan adreslerin e-postasını
// iletir. Email Routing'de bir kural yalnız tek hedefe gidebildiği için gerekli.
// Alıcılar e-posta panelinden (admin.ahtapot.ink) yönetilir ve KV'de durur; KV
// okunamazsa posta kaybolmasın diye aşağıdaki listeye düşer.
// Yayın: npx wrangler deploy --config workers/eposta-yonlendirme.wrangler.jsonc
// Her hedef Email Routing → Destination addresses altında "Verified" olmalı.
const YEDEK_HEDEFLER = ["a.keremyildiz99@gmail.com", "jrsweet8@gmail.com"];

export async function hedefleriOku(adres, env) {
  try {
    const harita = await env.PANEL_KV.get("adres-hedefleri", "json");
    const hedefler = harita?.[adres.toLowerCase()];
    if (Array.isArray(hedefler) && hedefler.length > 0) return hedefler;
  } catch (hata) {
    console.error("KV okunamadı:", String(hata));
  }
  return YEDEK_HEDEFLER;
}

export default {
  async email(message, env) {
    const hedefler = await hedefleriOku(message.to, env);
    // Biri başarısız olursa (ör. henüz doğrulanmamış adres) diğeri yine gider.
    const sonuclar = await Promise.allSettled(hedefler.map((adres) => message.forward(adres)));
    sonuclar.forEach((sonuc, i) => {
      if (sonuc.status === "rejected") console.error("İletilemedi:", hedefler[i], String(sonuc.reason));
    });
  },
};
