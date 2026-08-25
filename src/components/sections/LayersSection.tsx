import { getTranslations } from "next-intl/server";
import { LayerBeats } from "./LayerBeats";

const LAYER_IDS = [
  "mekanik",
  "elektronik",
  "gomulu",
  "uygulama",
  "saha",
] as const;

/**
 * 5 kompakt beat, SiteRail'in 5 kink'iyle aynı sıra/id — bkz. spec §7.
 */
export async function LayersSection() {
  const tLabel = await getTranslations("nav.layers");
  const tSentence = await getTranslations("layerSentences");

  const items = LAYER_IDS.map((id) => ({
    id,
    label: tLabel(id),
    sentence: tSentence(id),
    // Yalnız uygulama katmanının gerçek görseli var (AhtaPatoloji arayüzü) —
    // diğer 4 katman için henüz görsel yok, uydurmadık (bkz. mock-data-todo).
    image:
      id === "uygulama"
        ? {
            src: "/products/dijital-patoloji/annotasyon.png",
            alt: "AhtaPatoloji arayüzünde whole-slide görüntüde annotasyon",
          }
        : undefined,
  }));

  return (
    <section id="katmanlar">
      <LayerBeats items={items} />
    </section>
  );
}
