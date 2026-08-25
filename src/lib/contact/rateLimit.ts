/**
 * Basit, bellek-içi rate limit — IP başına sabit pencere. Veritabanı yok
 * (spec), bu yüzden en pratik çözüm bu; ama dürüst olmak gerekirse: bu
 * `Map`, Node process'i içinde yaşıyor. Vercel gibi çoklu-instance/
 * serverless bir ortamda her instance kendi sayacını tutar ve soğuk
 * başlangıçta sıfırlanır — yani "gerçek" bir limit değil, kaba bir
 * caydırıcı. Trafik büyürse Upstash Redis gibi kalıcı bir store'a
 * taşınmalı (bkz. docs/mock-data-todo.md).
 */
const WINDOW_MS = 10 * 60 * 1000; // 10 dakika
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  // Map sınırsız büyümesin diye ara sıra süresi geçmiş anahtarları temizle.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}
