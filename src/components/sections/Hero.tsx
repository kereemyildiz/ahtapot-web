import { getTranslations } from "next-intl/server";

/**
 * Hero H1 64px (88px değil, metin kesilmedi) ve tek birincil CTA (ürünlere
 * gider) — bkz. spec §6 gerekçe. `wdth` genişletilmiş yalnız burada
 * kullanılıyor (bkz. src/lib/fonts.ts, Archivo axes:['wdth']).
 *
 * Mobilde yükseklik içerik kadar (100dvh zorlanmıyor) — aynı taşma riski
 * mobilde de var, aynı çözüm.
 */
export async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section
      id="hero"
      className="flex min-h-[70vh] flex-col justify-center gap-6 py-24 md:min-h-screen"
    >
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("eyebrow")}
      </p>
      <h1
        className="max-w-3xl font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.01em] md:text-[64px] md:leading-[1.06] md:tracking-[-0.015em]"
        style={{ fontVariationSettings: "'wdth' 125" }}
      >
        {t("heading")}
      </h1>
      <a
        href="#urunler"
        className="w-fit border border-foreground px-5 py-3 font-body text-[15px] font-semibold tracking-[0.01em] transition-colors hover:bg-foreground hover:text-background"
      >
        {t("cta")}
      </a>
    </section>
  );
}
