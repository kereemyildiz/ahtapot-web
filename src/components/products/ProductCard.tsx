import { getTranslations } from "next-intl/server";
import type { Product, ProductLayer } from "@/content/schema";
import { LayerStrip } from "@/components/meander/LayerStrip";
import { ProductPreview } from "./ProductPreview";
import { Link } from "@/i18n/navigation";

type ProductCardProps = {
  product: Product;
  /** paired: ürünler bölümünün standart 2 kolonlu satırı. single: featured
   *  satırı — spec §3. */
  variant: "paired" | "single";
};

/**
 * Ana sayfadaki kart — sakin, statik önizleme + "Detayları gör" linki.
 * Canlı turntable/deepzoom etkileşimi burada değil, `/urunler/[slug]`'da
 * (bkz. ProductPreview.tsx, app/[locale]/urunler/[slug]/page.tsx).
 */
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
      id={product.slug}
      className={
        variant === "single"
          ? "grid scroll-mt-6 gap-6 border border-steel/20 p-6 md:grid-cols-[3fr_2fr]"
          : "flex scroll-mt-6 flex-col gap-4 border border-steel/20 p-6"
      }
    >
      <Link href={`/urunler/${product.slug}`} className="block">
        <ProductPreview product={product} />
      </Link>
      <div className="flex flex-col gap-3">
        {/* Rozet olsun/olmasın bu slot hep aynı yüksekliği kaplıyor —
            yoksa "GELİŞTİRME AŞAMASINDA" olan kart başlığı, olmayan
            karta göre aşağı kayıyordu (hizalama bozuluyordu). */}
        <div className="h-6">
          {product.status === "in-development" && (
            <span className="w-fit border border-eosin px-2 py-0.5 font-mono-data text-[11px] uppercase tracking-[0.06em] text-eosin">
              {tProductUi("inDevelopmentBadge")}
            </span>
          )}
        </div>
        <h3 className="font-display text-xl font-semibold">
          {tProducts(`${product.slug}.name`)}
        </h3>
        {/* min-h: 2 satırlık yer hep ayrılıyor — yoksa 1 satırlık ve 2
            satırlık tagline'lar arasında altındaki layer-strip/"detayları
            gör" satırları kartlar arasında hizasız kalıyordu. */}
        <p className="min-h-[42px] font-body text-sm text-foreground/80">
          {tProducts(`${product.slug}.tagline`)}
        </p>
        <LayerStrip activeLayers={product.layers} labels={layerLabels} />
        <Link
          href={`/urunler/${product.slug}`}
          className="w-fit font-mono-data text-xs uppercase tracking-[0.06em] text-ahtapot hover:text-eosin"
        >
          {tProductUi("detailsCta")} →
        </Link>
      </div>
    </article>
  );
}
