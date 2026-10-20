import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { LegalPage } from "@/components/site/LegalPage";

// TODO: hukuk kontrolünden geçmeli.
export default async function PrivacyPage({ params }: PageProps<"/[locale]/gizlilik">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <LegalPage namespace="privacy" />;
}
