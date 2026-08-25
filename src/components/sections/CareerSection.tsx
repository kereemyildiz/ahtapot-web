import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function CareerSection() {
  const t = await getTranslations("nav.sections");
  const tCareer = await getTranslations("career");

  return (
    <section id="kariyer" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("kariyer")}
      </p>
      <p className="mt-6 max-w-xl font-body text-lg text-foreground">
        {tCareer("message")}
      </p>
      <Link
        href="/?type=is-basvurusu#iletisim"
        className="mt-4 inline-block w-fit font-mono-data text-xs uppercase tracking-[0.06em] text-ahtapot hover:text-eosin"
      >
        {tCareer("contactCta")} →
      </Link>
    </section>
  );
}
