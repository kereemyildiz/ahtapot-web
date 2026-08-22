"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Product, ProductInteraction } from "@/content/schema";
import { Gallery } from "./Gallery";

// turntable/deepzoom yalnız viewport'a girince (ve yalnız gerçekten
// seçildiklerinde) yükleniyor — CLAUDE.md performans bütçesi.
const Turntable = dynamic(
  () => import("./Turntable").then((m) => m.Turntable),
  { ssr: false }
);
const DeepZoom = dynamic(() => import("./DeepZoom").then((m) => m.DeepZoom), {
  ssr: false,
});

const INTERACTION_COMPONENTS: Record<
  ProductInteraction,
  ComponentType<{ product: Product }>
> = {
  turntable: Turntable,
  deepzoom: DeepZoom,
  gallery: Gallery,
};

/**
 * `interaction` alanından bileşen seçer — bir lookup, ürüne özel if/else
 * zinciri değil. Bilinmeyen değer gallery'ye düşer, hata vermez
 * (CLAUDE.md).
 */
export function ProductInteractionView({ product }: { product: Product }) {
  const Component =
    INTERACTION_COMPONENTS[product.interaction as ProductInteraction] ??
    Gallery;
  return <Component product={product} />;
}
