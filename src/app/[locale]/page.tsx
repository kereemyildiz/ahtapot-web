import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { jsonLdHtml, organizationJsonLd, pageAlternates, shareMetadata } from "@/lib/seo";
import { PageMotion } from "@/components/motion/PageMotion";
import { Hero } from "@/components/home/Hero";
import { Capability } from "@/components/home/capability/Capability";
import { Products } from "@/components/home/Products";
import { About } from "@/components/home/About";
import { Contact } from "@/components/home/Contact";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("homeTitle");
  const description = t("siteDescription");
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale),
    ...shareMetadata(locale, title, description),
  };
}

// Referanslar bölümü bilinçli olarak yok: gerçek referans verilince eklenir.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  return (
    <main>
      {/* Yapılandırılmış veri (çalışmayan veri bloğu; React istemcide uyarmaz). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(organizationJsonLd(locale as AppLocale))} />
      <PageMotion>
        <Hero />
        <Capability />
        <Products />
        <About />
        <Contact />
      </PageMotion>
    </main>
  );
}
