import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { localeHref } from "@/i18n/href";
import { getMedia } from "@/content/media";
import { Icon } from "@/components/brand/Icon";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/kaynaklar">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "credits" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  return { title: `${t("title")} · ${tMeta("siteTitle")}`, alternates: pageAlternates(locale, "/kaynaklar") };
}

/**
 * Görsel kaynakları: açık lisanslı her fotoğrafın adı, yazarı ve lisansı
 * (CC BY / BY-SA atıf zorunluluğu). Footer'dan tek bağlantıyla açılır.
 */
export default async function CreditsPage({ params }: PageProps<"/[locale]/kaynaklar">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("credits");
  const tCompany = await getTranslations("company");
  const { credits } = getMedia();
  // Atıf gerektiren görsel yoksa sayfa da yok.
  if (credits.length === 0) notFound();

  return (
    <main className="frame pb-24 pt-[calc(var(--header-h)+clamp(2rem,5vw,4rem))]">
      <div className="max-w-3xl">
        <Link href={localeHref(locale as AppLocale, "/")} className="inline-flex items-center gap-1.5 text-small text-muted transition-colors hover:text-ink">
          <Icon name="arrowLeft" className="size-4" strokeWidth={2} />
          {tCompany("shortName")}
        </Link>
        <h1 className="section-title mt-8">{t("title")}</h1>
        <p className="mt-8 text-body text-ink/90">{t("intro")}</p>
        <ul className="mt-10 flex flex-col gap-6 text-body">
          {credits.map((credit) => (
            <li key={credit.page} className="border-l-2 border-periwinkle/40 pl-4">
              <a href={credit.page} className="link" rel="noreferrer" target="_blank">
                {credit.title}
              </a>
              <p className="mt-1 text-small text-muted">
                {credit.creator ? `${credit.creator} · ` : ""}
                <a href={credit.licenseUrl} className="link text-muted" rel="noreferrer" target="_blank">
                  {credit.license}
                </a>{" "}
                · {credit.via}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
