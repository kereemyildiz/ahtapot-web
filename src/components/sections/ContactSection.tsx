import { getTranslations } from "next-intl/server";

// TODO: form (ad/e-posta/kurum/mesaj + KVKK checkbox) ve
// app/api/contact/route.ts (Resend + Zod) bu round'un kapsamında değil —
// yalnız bölüm iskeleti + gerçek şirket adresi (kullanıcı verdi).
export async function ContactSection() {
  const t = await getTranslations("nav.sections");
  const tCompany = await getTranslations("company");

  return (
    <section id="iletisim" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("iletisim")}
      </p>
      <div className="mt-6 flex flex-col gap-1">
        <p className="font-body text-base text-foreground">
          {tCompany("legalName")}
        </p>
        <p className="font-body text-sm text-foreground/70">
          {tCompany("address")}
        </p>
      </div>
    </section>
  );
}
