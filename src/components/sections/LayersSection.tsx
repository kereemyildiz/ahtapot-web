import { getTranslations } from "next-intl/server";

const LAYER_IDS = [
  "mekanik",
  "elektronik",
  "gomulu",
  "uygulama",
  "saha",
] as const;

/**
 * 5 kompakt beat (spec §7) — SiteRail'in 5 kink'iyle aynı sıra/id. Bu
 * round'da yalnız katman etiketleri var; her beat'in gerçek cümlesi/görseli
 * ya da tipografik `stat` fallback'i görsel bölüm çalışmasında eklenecek
 * (bkz. LayerBeat tipi, tasarım dokümanı §7).
 */
export async function LayersSection() {
  const t = await getTranslations("nav.layers");

  return (
    <section id="katmanlar" className="flex flex-col">
      {LAYER_IDS.map((id) => (
        <div
          key={id}
          id={id}
          className="flex min-h-[40vh] items-center border-t border-steel/20 py-10 md:min-h-[42vh]"
        >
          <h2 className="font-display text-3xl font-semibold tracking-[-0.01em] md:text-5xl">
            {t(id)}
          </h2>
        </div>
      ))}
    </section>
  );
}
