import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { getLocaleContent } from "@/content";

/** Yayındaki alan adı: canonical, hreflang, site haritası ve yapılandırılmış veri. */
export const SITE_URL = "https://ahtapot.ink";

const OG_LOCALE: Record<AppLocale, string> = { tr: "tr_TR", en: "en_US" };

/**
 * Bir sayfanın canonical ve dil karşılıkları. `path` dil önekinden sonrası
 * ("" ana sayfa, "/kvkk"…). x-default öneksiz adres: dil seçimini
 * proxy yapar (next-intl'in Link başlığıyla aynı).
 */
export function pageAlternates(locale: AppLocale, path = ""): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  languages["x-default"] = path || "/";
  return { canonical: `/${locale}${path}`, languages };
}

/** Paylaşım kartı (Open Graph / X): dile göre görsel, başlık ve açıklama. */
export function shareMetadata(locale: AppLocale, title: string, description: string, path = ""): Pick<Metadata, "openGraph" | "twitter"> {
  const siteName = getLocaleContent(locale).meta.siteTitle;
  const image = { url: `/og/${locale}.png`, width: 1200, height: 630, alt: siteName };
  return {
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

/**
 * Şirketin yapılandırılmış verisi (schema.org Organization + WebSite): arama
 * motoru markayı, adresi ve iletişimi buradan okur. Değerler içerikten
 * (content/tr.json → company); adres Türkçe yazımıyla.
 */
export function organizationJsonLd(locale: AppLocale) {
  const tr = getLocaleContent("tr");
  const c = getLocaleContent(locale);
  const lines = tr.company.address;
  const last = lines[lines.length - 1];
  // "34903 Pendik/İstanbul" → posta kodu, ilçe, il
  const m = /^(\d{5})\s+([^/]+)\/(.+)$/.exec(last);
  const address = {
    "@type": "PostalAddress",
    streetAddress: lines.slice(0, -1).join(" "),
    ...(m ? { postalCode: m[1], addressLocality: m[2].trim(), addressRegion: m[3].trim() } : {}),
    addressCountry: "TR",
  };
  const org = `${SITE_URL}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: tr.meta.siteTitle,
        legalName: tr.company.legalName,
        alternateName: [...new Set([tr.company.shortName, getLocaleContent("en").meta.siteTitle])],
        url: SITE_URL,
        logo: `${SITE_URL}/brand/logo-square.png`,
        // Google bu düğümü yerel işletme olarak da okuyor; görsel yoksa uyarı veriyor.
        image: `${SITE_URL}/og/${locale}.png`,
        description: c.meta.siteDescription,
        ...(tr.company.email ? { email: tr.company.email } : {}),
        ...(tr.company.phone ? { telephone: tr.company.phone } : {}),
        address,
        ...(tr.company.sameAs.length ? { sameAs: tr.company.sameAs } : {}),
        areaServed: { "@type": "Country", name: "Türkiye" },
        knowsAbout: c.meta.knowsAbout,
        // Footer'daki belge rozetleri (Teknogirişim Rozeti).
        award: c.footer.badges.flatMap((b) => (b.award ? [b.award] : [])),
        founder: { "@type": "Person", name: tr.about.founder.name, jobTitle: c.about.founder.role },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: tr.meta.siteTitle,
        alternateName: tr.company.shortName,
        inLanguage: [...routing.locales],
        publisher: { "@id": org },
      },
    ],
  };
}

/**
 * Alt sayfanın içerik yolu (schema.org BreadcrumbList): arama sonucunda adres
 * yerine "Ahtapot Tıbbi Teknolojiler › Sayfa" görünür. Son öğe sayfanın kendisi.
 */
export function breadcrumbJsonLd(locale: AppLocale, path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: getLocaleContent(locale).meta.siteTitle, item: `${SITE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}/${locale}${path}` },
    ],
  };
}

/** JSON-LD'yi <script> içine güvenle yazar (Next.js JSON-LD rehberi). */
export function jsonLdHtml(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
