import "server-only";
import { routing, type AppLocale } from "@/i18n/routing";
import { getLocaleContent } from "@/content";
import { getProducts } from "@/content/products";
import { SITE_URL } from "@/lib/seo";

/*
 * Yapay zekâ asistanları için düz metin özet (llmstxt.org): ChatGPT, Claude,
 * Perplexity gibi araçlar siteyi gezmeden şirketi, ürünleri ve iletişimi
 * buradan okur. Metnin tamamı içerikten (content/*.json) gelir; burada yeni
 * iddia yazılmaz. /llms.txt kısa özet ve bağlantılar, /llms-full.txt sitenin
 * tüm metni.
 */

const LAYERS = ["mekanik", "elektronik", "gomulu", "uygulama", "saha"] as const;

function status(locale: AppLocale, s: "available" | "in-development") {
  const p = getLocaleContent(locale).product;
  return s === "available" ? p.statusAvailable : p.inDevelopmentBadge;
}

function facts(locale: AppLocale) {
  const c = getLocaleContent(locale);
  return [
    `- ${c.company.legalName}`,
    `- ${c.contact.addressLabel}: ${c.company.address.join(", ")}`,
    `- ${c.contact.emailLabel}: ${c.company.email}`,
    `- ${c.contact.phoneLabel}: ${c.company.phone}`,
    `- ${c.about.founder.label}: ${c.about.founder.name} (${c.about.founder.role})`,
    ...c.about.facts.map((f) => `- ${f.label}: ${f.value}`),
    ...c.footer.badges.flatMap((b) => (b.award ? [`- ${b.award}`] : [])),
  ];
}

/** /llms.txt: Türkçe özet, İngilizce karşılığı ve sayfa bağlantıları. */
export function llmsSummary() {
  const tr = getLocaleContent("tr");
  const en = getLocaleContent("en");
  const products = getProducts();
  const lines = [
    `# ${tr.meta.siteTitle}`,
    "",
    `> ${tr.meta.siteDescription}`,
    "",
    `${tr.about.lead} ${tr.about.body}`,
    "",
    `${en.meta.siteDescription} ${en.about.lead}`,
    "",
    ...facts("tr"),
    "",
    `## ${tr.product.heading} / ${en.product.heading}`,
    "",
    ...products.flatMap((p) =>
      routing.locales.map((l) => {
        const c = getLocaleContent(l).products[p.slug];
        return `- [${c.name}](${SITE_URL}/${l}/urunler/${p.slug}): ${c.tagline} (${status(l, p.status)})`;
      }),
    ),
    "",
    `## ${tr.capability.heading} / ${en.capability.heading}`,
    "",
    ...LAYERS.map((k) => `- [${tr.capability.items[k].title}](${SITE_URL}/tr#kabiliyet-${k}): ${tr.capability.items[k].sentence}`),
    "",
    `## ${tr.meta.llms.pages} / ${en.meta.llms.pages}`,
    "",
    ...routing.locales.map((l) => `- [${getLocaleContent(l).nav.home}](${SITE_URL}/${l})`),
    `- [${tr.meta.llms.fullText}](${SITE_URL}/llms-full.txt)`,
    ...routing.locales.flatMap((l) => {
      const c = getLocaleContent(l);
      return [`- [${c.kvkk.title}](${SITE_URL}/${l}/kvkk)`, `- [${c.privacy.title}](${SITE_URL}/${l}/gizlilik)`];
    }),
    "",
  ];
  return lines.join("\n");
}

function fullFor(locale: AppLocale) {
  const c = getLocaleContent(locale);
  const out = [
    `# ${c.meta.siteTitle}`,
    "",
    `> ${c.meta.siteDescription}`,
    "",
    `${c.hero.title} ${c.hero.lead}`,
    "",
    `## ${c.capability.heading}`,
    "",
  ];
  for (const k of LAYERS) {
    const it = c.capability.items[k];
    out.push(`### ${it.title}`, "", it.sentence, "", ...it.deliverables.map((d) => `- ${d}`), "");
  }
  out.push(`## ${c.product.heading}`, "", c.product.intro, "");
  for (const p of getProducts()) {
    const pc = c.products[p.slug];
    out.push(
      `### ${pc.name}`,
      "",
      `${status(locale, p.status)} · ${SITE_URL}/${locale}/urunler/${p.slug}`,
      "",
      pc.tagline,
      "",
      pc.description,
      "",
      `${c.product.featuresHeading}:`,
      "",
      ...pc.features.map((f) => `- ${f}`),
      "",
    );
    // Mevzuat: simülasyon değerleri spesifikasyon değildir; özet de bunu söyler.
    if (p.interaction === "simulator") out.push(c.product.simulator.disclaimer, "");
  }
  out.push(`## ${c.about.heading}`, "", c.about.lead, "", c.about.body, "", ...facts(locale), "");
  for (const pillar of c.about.pillars) out.push(`### ${pillar.title}`, "", pillar.text, "");
  out.push(
    `### ${c.about.founder.label}: ${c.about.founder.name}`,
    "",
    `${c.about.founder.role}. ${c.about.founder.bio}`,
    "",
    `## ${c.contact.heading}`,
    "",
    `${c.contact.promptLine1} ${c.contact.promptLine2}`,
    "",
    `- ${c.contact.addressLabel}: ${c.company.address.join(", ")}`,
    `- ${c.contact.emailLabel}: ${c.company.email}`,
    `- ${c.contact.phoneLabel}: ${c.company.phone}`,
    `- ${SITE_URL}/${locale}#iletisim`,
    "",
  );
  return out.join("\n");
}

/** /llms-full.txt: sitenin tüm metni, önce Türkçe sonra İngilizce. */
export function llmsFull() {
  return routing.locales.map(fullFor).join("\n---\n\n");
}

/** İki dosyanın yanıtı: düz metin; arama sonucunda sayfa olarak görünmez. */
export function llmsResponse(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
