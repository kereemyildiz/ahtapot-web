import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { LegalPage } from "@/components/site/LegalPage";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/gizlilik">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "privacy" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  return { title: `${t("title")} · ${tMeta("siteTitle")}`, alternates: pageAlternates(locale, "/gizlilik") };
}

// TODO: hukuk kontrolünden geçmeli.
export default async function PrivacyPage({ params }: PageProps<"/[locale]/gizlilik">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <LegalPage namespace="privacy" />;
}
