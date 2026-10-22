import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/*
 * Yapay zekâ botları açıkça adlandırılır ve hepsine izin verilir (kullanıcı:
 * asistanların önerilerinde çıkmak istiyoruz). Arama botları (OAI-SearchBot,
 * Claude-SearchBot, PerplexityBot…) asistanın canlı aramasında siteyi bulur;
 * eğitim botları (GPTBot, ClaudeBot, Google-Extended, CCBot…) modelin şirketi
 * aramadan da tanımasını sağlar. Kapatmak gerekirse grubu ayırıp disallow verin.
 */
const AI_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-webindexer",
  "meta-externalagent",
  "DuckAssistBot",
  "MistralAI-User",
  "CCBot",
];

// Yoktu: /robots.txt Worker'da 500 dönüyordu (Google 5xx robots.txt'de siteyi taramaz).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      { userAgent: AI_BOTS, allow: "/", disallow: "/api/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
