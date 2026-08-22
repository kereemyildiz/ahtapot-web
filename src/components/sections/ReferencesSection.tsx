import { getTranslations } from "next-intl/server";

export type Reference = { name: string };

/**
 * Yalnızca gerçek referans varsa render edilir; yoksa bölüm hiç render
 * edilmez (CLAUDE.md). Rail'deki tick sayısı da buna bağlı — bkz.
 * [locale]/page.tsx.
 */
export async function ReferencesSection({
  references,
}: {
  references: Reference[];
}) {
  if (references.length === 0) return null;

  const t = await getTranslations("nav.sections");
  return (
    <section id="referanslar" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("referanslar")}
      </p>
    </section>
  );
}
