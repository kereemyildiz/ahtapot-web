import { getTranslations } from "next-intl/server";
import type { Product, ProductLayer } from "@/content/schema";
import { LayerStrip } from "@/components/meander/LayerStrip";
import { ProductInteractionView } from "./ProductInteractionView";

type ProductCardProps = {
  product: Product;
  /** paired: ürünler bölümünün standart 2 kolonlu satırı. single: featured
   *  satırı — spec §3. */
  variant: "paired" | "single";
};

export async function ProductCard({ product, variant }: ProductCardProps) {
  const tProducts = await getTranslations("products");
  const tLayers = await getTranslations("nav.layers");
  const tProductUi = await getTranslations("product");

  const layerLabels: Record<ProductLayer, string> = {
    mekanik: tLayers("mekanik"),
    elektronik: tLayers("elektronik"),
    gomulu: tLayers("gomulu"),
    uygulama: tLayers("uygulama"),
  };

  return (
    <article
      className={
        variant === "single"
          ? "grid gap-6 border border-steel/20 p-6 md:grid-cols-[3fr_2fr]"
          : "flex flex-col gap-4 border border-steel/20 p-6"
      }
    >
      <div>
        <ProductInteractionView product={product} />
      </div>
      <div className="flex flex-col gap-3">
        {product.status === "in-development" && (
          <span className="w-fit border border-eosin px-2 py-0.5 font-mono-data text-[11px] uppercase tracking-[0.06em] text-eosin">
            {tProductUi("inDevelopmentBadge")}
          </span>
        )}
        <h3 className="font-display text-xl font-semibold">
          {tProducts(`${product.slug}.name`)}
        </h3>
        <p className="font-body text-sm text-foreground/80">
          {tProducts(`${product.slug}.tagline`)}
        </p>
        <LayerStrip activeLayers={product.layers} labels={layerLabels} />
      </div>
    </article>
  );
}
