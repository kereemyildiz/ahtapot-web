// Canlı site haritasındaki adresleri IndexNow'a bildirir (Bing, Yandex, Seznam, Naver…;
// Google IndexNow kullanmaz, onun için Search Console). Yayından sonra çalıştırın:
//   node tools/seo/indexnow.mjs
// Anahtar herkese açıktır: public/<anahtar>.txt aynı değeri sunar, sahipliği o kanıtlar.

const SITE = "https://ahtapot.ink";
const KEY = "f18b4e8c71d33e9f1f49f0dd2c0418b0";

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error("Site haritasında adres yok");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
// 200/202: alındı; 403: anahtar dosyası henüz yayında değil; 422: adresler alan adıyla uyuşmuyor.
console.log(res.status, res.statusText, `${urlList.length} adres`);
