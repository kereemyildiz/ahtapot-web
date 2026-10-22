import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Yoktu: /robots.txt Worker'da 500 dönüyordu (Google 5xx robots.txt'de siteyi taramaz).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
