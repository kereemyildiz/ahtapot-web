import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export default async function PrivacyPage({
  params,
}: PageProps<"/[locale]/gizlilik">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const t = await getTranslations("privacy");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
      <Link
        href="/#iletisim"
        className="font-mono-data text-xs uppercase tracking-[0.06em] text-steel transition-colors hover:text-ahtapot"
      >
        ← Ahtapot
      </Link>

      <h1 className="mt-8 font-display text-3xl font-semibold tracking-[-0.01em] md:text-5xl">
        {t("title")}
      </h1>

      <p className="mt-6 border border-eosin px-4 py-3 font-mono-data text-xs uppercase tracking-[0.04em] text-eosin">
        {t("legalReviewNote")}
      </p>

      <div className="mt-10 flex flex-col gap-5">
        {(t.raw("body") as string[]).map((paragraph, index) => (
          <p
            key={index}
            className="font-body leading-relaxed text-foreground/85"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
