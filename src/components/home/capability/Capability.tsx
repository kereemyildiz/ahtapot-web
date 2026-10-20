import { getTranslations } from "next-intl/server";
import { LAYER_IDS } from "@/content/constants";
import { getImage, getMedia } from "@/content/media";
import { SectionRule } from "@/components/motion/SectionRule";
import { Words } from "@/components/motion/Words";
import { CapabilityStage } from "./CapabilityStage";
import type { ToolLabels } from "./visuals";

/**
 * Yetkinlikler: bir cihazın beş katmanı. Solda katmanlar akar, sağda sabit
 * bir sahnede etkin katmanın çizimi kendini çizer.
 */
export async function Capability() {
  const t = await getTranslations("capability");
  const tLayers = await getTranslations("layers");
  const media = getMedia();

  const items = LAYER_IDS.map((id) => {
    const key = media.capability[id];
    const keys = key === null ? [] : Array.isArray(key) ? key : [key];
    return {
      id,
      layer: tLayers(id),
      title: t(`items.${id}.title`),
      sentence: t(`items.${id}.sentence`),
      deliverables: t.raw(`items.${id}.deliverables`) as string[],
      caption: t(`items.${id}.caption`),
      alt: t(`items.${id}.alt`),
      images: keys.map(getImage),
    };
  });

  return (
    <section id="kabiliyet" aria-labelledby="kabiliyet-title" className="frame py-[clamp(7rem,14vw,12rem)]">
      <SectionRule />
      <h2 id="kabiliyet-title" data-split="" className="section-title max-w-[18ch]">
        <Words text={t("heading")} />
      </h2>
      <div className="mt-[clamp(3rem,7vw,6rem)]">
        <CapabilityStage items={items} progressLabel={t("progressLabel")} tools={t.raw("visuals") as ToolLabels} />
      </div>
    </section>
  );
}
