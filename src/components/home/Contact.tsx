import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { localeHref } from "@/i18n/href";
import { getLocaleContent } from "@/content";
import { ContactForm } from "./ContactForm";
import { DrawnMark } from "@/components/motion/DrawnMark";
import { SectionRule } from "@/components/motion/SectionRule";
import { Words } from "@/components/motion/Words";
import { Icon, type IconName } from "@/components/brand/Icon";

// Ayrıntı satırı: ikon terimin yanında, değer altında aynı hizadan başlar.
function Term({ icon, children }: { icon: IconName; children: string }) {
  return (
    <dt className="flex items-center gap-2 text-small text-muted">
      <Icon name={icon} className="size-4 text-periwinkle" />
      {children}
    </dt>
  );
}

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
          <dl className="mt-6 grid gap-6 text-body">
            <div>
              <Term icon="pin">{t("addressLabel")}</Term>
              <dd className="mt-1 text-ink">
                {tCompany("legalName")}
                <br />
                {tCompany("address")}
              </dd>
            </div>
            {/* TODO: gerçek e-posta / telefon content/*.json → company'ye girilince görünür. */}
            {email && (
              <div>
                <Term icon="mail">{t("emailLabel")}</Term>
                <dd className="mt-1">
                  <a href={`mailto:${email}`} className="link">
                    {email}
                  </a>
                </dd>
              </div>
            )}
            {phone && (
              <div>
                <Term icon="phone">{t("phoneLabel")}</Term>
                <dd className="mt-1">
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="link">
                    {phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <DrawnMark className="mt-16 hidden h-[clamp(14rem,24vw,22rem)] lg:block" />
        </aside>
      </div>
    </section>
  );
}
