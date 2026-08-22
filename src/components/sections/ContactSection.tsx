import { getTranslations } from "next-intl/server";

// TODO: form (ad/e-posta/kurum/mesaj + KVKK checkbox) ve
// app/api/contact/route.ts (Resend + Zod) bu round'un kapsamında değil —
// yalnız bölüm iskeleti.
export async function ContactSection() {
  const t = await getTranslations("nav.sections");
  return (
    <section id="iletisim" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("iletisim")}
      </p>
    </section>
  );
}
