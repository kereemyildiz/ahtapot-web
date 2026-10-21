import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { localeHref } from "@/i18n/href";
import { Icon } from "@/components/brand/Icon";

/** KVKK ve Gizlilik için ortak şablon. Metin hukuk kontrolünden geçmeli. */
export async function LegalPage({ namespace }: { namespace: "kvkk" | "privacy" }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations(namespace);
  const tCompany = await getTranslations("company");

  return (
    <main className="frame pb-24 pt-[calc(var(--header-h)+clamp(2rem,5vw,4rem))]">
      <div className="max-w-3xl">
        <Link href={localeHref(locale, "/#iletisim")} className="inline-flex items-center gap-1.5 text-small text-muted transition-colors hover:text-ink">
          <Icon name="arrowLeft" className="size-4" strokeWidth={2} />
          {tCompany("shortName")}
        </Link>
        <h1 className="section-title mt-8">{t("title")}</h1>
        <p className="mt-8 inline-flex items-center gap-2 bg-field px-3 py-2 text-small font-semibold text-field-ink">
          <span className="size-2 bg-eosin" aria-hidden="true" />
          {t("legalReviewNote")}
        </p>
        <div className="mt-10 flex flex-col gap-5 text-body text-ink/90">
          {(t.raw("body") as string[]).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
