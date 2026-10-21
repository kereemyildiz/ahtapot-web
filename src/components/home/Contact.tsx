import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { localeHref } from "@/i18n/href";
import { getLocaleContent } from "@/content";
import { ContactForm } from "./ContactForm";
import { ContactReach } from "./ContactReach";
import { SectionRule } from "@/components/motion/SectionRule";
import { Words } from "@/components/motion/Words";

export async function Contact() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("contact");
  const tCompany = await getTranslations("company");
  const email = tCompany("email");
  const phone = tCompany("phone");

  return (
    <section id="iletisim" aria-labelledby="iletisim-title" className="frame py-[clamp(7rem,14vw,13rem)]">
      <SectionRule />
      <h2 id="iletisim-title" data-split="" className="section-title">
        <Words text={t("heading")} />
      </h2>
      <p data-reveal="" className="mt-8 max-w-[30ch] text-[clamp(1.4rem,0.9rem+1.6vw,2.35rem)] leading-[1.2] tracking-[-0.01em]">
        <span className="block text-muted">{t("promptLine1")}</span>
        <span className="block text-ink">{t("promptLine2")}</span>
      </p>

      <div className="mt-[clamp(3rem,6vw,5rem)] grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div data-reveal="" className="lg:col-span-7">
          <Suspense fallback={null}>
            <ContactForm labels={getLocaleContent(locale).contact} kvkkHref={localeHref(locale, "/kvkk")} />
          </Suspense>
        </div>

        <aside data-reveal="" className="lg:col-span-4 lg:col-start-9" aria-label={t("detailsHeading")}>
          <p className="font-display text-[1.25rem] font-medium tracking-[-0.02em]">{t("detailsHeading")}</p>
          <div className="mt-8">
            {/* Ahtapotun kolları iletişim satırlarına uzanır (hero'nun kapanışı). */}
            <ContactReach
              brand={{ name: tCompany("shortName"), sub: tCompany("brandSub") }}
              rows={[
                { icon: "pin", label: t("addressLabel"), lines: [tCompany("legalName"), tCompany("address")] },
                // TODO: gerçek e-posta content/*.json → company.email'e girilince görünür.
                ...(email ? [{ icon: "mail" as const, label: t("emailLabel"), lines: [email], href: `mailto:${email}` }] : []),
                ...(phone ? [{ icon: "phone" as const, label: t("phoneLabel"), lines: [phone], href: `tel:${phone.replace(/\s/g, "")}` }] : []),
              ]}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
