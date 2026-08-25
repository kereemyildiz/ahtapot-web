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
  }));

  return (
    <section id="katmanlar">
      <LayerBeats items={items} />
    </section>
  );
}
