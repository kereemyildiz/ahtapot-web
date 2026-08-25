import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "./ContactForm";

export async function ContactSection() {
  const t = await getTranslations("nav.sections");
  const tCompany = await getTranslations("company");

  return (
    <section id="iletisim" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("iletisim")}
      </p>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-1">
          <p className="font-body text-base text-foreground">
            {tCompany("legalName")}
          </p>
          <p className="font-body text-sm text-foreground/70">
            {tCompany("address")}
          </p>
        </div>

        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      </div>
    </section>
  );
}
