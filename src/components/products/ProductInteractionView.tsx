"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LocaleContent, Product, ProductInteraction, ProductLayer } from "@/content/schema";
import { Gallery } from "./Gallery";

export type InteractionLabels = {
  dragHint: string;
  modelAlt: string;
  screens: string[];
  viewer: LocaleContent["product"]["viewer"];
  simulator: LocaleContent["product"]["simulator"];
};

type InteractionProps = {
  product: Product;
  labels: InteractionLabels;
  activeLayer?: ProductLayer | null;
};

// Ağır etkileşimler yalnız gerektiğinde ve yalnız istemcide yüklenir.
const Simulator = dynamic(() => import("./Simulator").then((m) => m.Simulator), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] bg-surface" />,
});
const Turntable = dynamic(() => import("./Turntable").then((m) => m.Turntable), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] bg-surface" />,
});
const DeepZoom = dynamic(() => import("./DeepZoom").then((m) => m.DeepZoom), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] bg-[#05060b]" />,
});

const INTERACTIONS: Record<ProductInteraction, ComponentType<InteractionProps>> = {
  simulator: Simulator,
  turntable: Turntable,
  deepzoom: DeepZoom,
  gallery: Gallery,
};

/**
 * `interaction` alanından bileşen seçer: bir lookup, ürüne özel if/else
 * değil. Bilinmeyen değer gallery'ye düşer, hata vermez.
 */
export function ProductInteractionView(props: InteractionProps) {
  const Component = INTERACTIONS[props.product.interaction as ProductInteraction] ?? Gallery;
  return <Component {...props} />;
}
