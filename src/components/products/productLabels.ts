import "server-only";
import { getTranslations } from "next-intl/server";
import { PRODUCT_LAYERS, type ProductLayer } from "@/content/constants";
import type { Product } from "@/content/schema";
import type { ExhibitCopy, ExhibitUi } from "./ProductExhibit";
import type { InteractionLabels } from "./ProductInteractionView";

/** Ürün sergisinin ihtiyaç duyduğu tüm metinleri içerikten toplar. */
export async function getExhibitUi(): Promise<ExhibitUi> {
  const t = await getTranslations("product");
  const tLayers = await getTranslations("layers");
  const layerNames = Object.fromEntries(
    PRODUCT_LAYERS.map((l) => [l, tLayers(l)])
  ) as Record<ProductLayer, string>;

  return {
    statusAvailable: t("statusAvailable"),
    inDevelopmentBadge: t("inDevelopmentBadge"),
    layersLabel: t("layersLabel"),
    detailsCta: t("detailsCta"),
    quoteCta: t("quoteCta"),
    demoCta: t("demoCta"),
    featuresHeading: t("featuresHeading"),
    layerNames,
    interaction: {
      dragHint: t("dragHint"),
      modelAlt: t("modelAlt"),
      screens: [],
      viewer: t.raw("viewer") as InteractionLabels["viewer"],
      simulator: t.raw("simulator") as InteractionLabels["simulator"],
    },
  };
}

export async function getExhibitCopy(product: Product): Promise<ExhibitCopy & { screens: string[] }> {
  const t = await getTranslations("products");
  return {
    name: t(`${product.slug}.name`),
    tagline: t(`${product.slug}.tagline`),
    description: t(`${product.slug}.description`),
    features: t.raw(`${product.slug}.features`) as string[],
    screens: t.raw(`${product.slug}.screens`) as string[],
    compare: t.has(`${product.slug}.compare`) ? (t.raw(`${product.slug}.compare`) as ExhibitCopy["compare"]) : undefined,
  };
}
