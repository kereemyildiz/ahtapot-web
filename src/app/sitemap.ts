import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getProducts } from "@/content/products";
import { getMedia } from "@/content/media";
import { SITE_URL } from "@/lib/seo";

/** Her sayfa her dilde, dil karşılıklarıyla (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    ...getProducts().map((p) => ({ path: `/urunler/${p.slug}`, priority: 0.8 })),
    { path: "/kvkk", priority: 0.2 },
    { path: "/gizlilik", priority: 0.2 },
    ...(getMedia().credits.length ? [{ path: "/kaynaklar", priority: 0.1 }] : []),
  ];
  return paths.flatMap(({ path, priority }) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    })),
  );
}
