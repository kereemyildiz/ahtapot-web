import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { localeHref } from "@/i18n/href";
import { getMedia } from "@/content/media";
import { LogoMark } from "@/components/brand/LogoMark";

/**
 * Kapanış: tek satır ve telefon. Atıf gerektiren bir görsel varsa
 * (media.json → credits) "Görsel kaynakları" bağlantısı da görünür.
 */
export async function Footer() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("footer");
  const tCompany = await getTranslations("company");
  const year = new Date().getFullYear();
  const phone = tCompany("phone");
  const hasCredits = getMedia().credits.length > 0;

  return (
    <footer className="frame overflow-hidden pb-8 pt-[clamp(4rem,8vw,7rem)] text-small text-muted">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-baseline">
        <p>
          {/* Logo ve şirketin adı yan yana; altında slogan ve telefon. */}
          <span className="mb-3 flex items-center gap-3">
            <LogoMark className="h-9 w-auto shrink-0" strokeWidth={44} gradientId="logo-footer" />
            <span className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
              {tCompany("shortName")} {tCompany("brandSub")}
            </span>
          </span>
          {t("tagline")}
          {phone && (
            <>
              {" · "}
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-ink hover:text-accent">
                {phone}
              </a>
            </>
          )}
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label={t("kvkk")}>
          <Link href={localeHref(locale, "/kvkk")} className="text-ink hover:text-accent">
            {t("kvkk")}
          </Link>
          <Link href={localeHref(locale, "/gizlilik")} className="text-ink hover:text-accent">
            {t("privacy")}
          </Link>
          {hasCredits && (
            <Link href={localeHref(locale, "/kaynaklar")} className="text-ink hover:text-accent">
              {t("credits")}
            </Link>
          )}
        </nav>
        <p className="md:text-right">© {year}</p>
      </div>
    </footer>
  );
}
