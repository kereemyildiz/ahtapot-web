import { getTranslations } from "next-intl/server";

export async function AboutSection() {
  const t = await getTranslations("nav.sections");
  const tAbout = await getTranslations("about");

  return (
    <section id="hakkimizda" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("hakkimizda")}
      </p>
      <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-foreground">
        {tAbout("paragraph")}
      </p>
    </section>
  );
}
