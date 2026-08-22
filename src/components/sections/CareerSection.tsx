import { getTranslations } from "next-intl/server";

export async function CareerSection() {
  const t = await getTranslations("nav.sections");
  return (
    <section id="kariyer" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("kariyer")}
      </p>
    </section>
  );
}
