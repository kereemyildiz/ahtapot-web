import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getProductBySlug, getProducts } from "@/content/products";
import type { ProductLayer } from "@/content/schema";
import { Link } from "@/i18n/navigation";
import { LayerStrip } from "@/components/meander/LayerStrip";
import { ProductInteractionView } from "@/components/products/ProductInteractionView";

export function generateStaticParams() {
  const products = getProducts();
  return routing.locales.flatMap((locale) =>
    products.map((product) => ({ locale, slug: product.slug }))
  );
}

/**
 * Ürün detay sayfası — "fancy" turntable/deepzoom etkileşimi burada
 * yaşıyor, ana sayfanın küçük kartında değil (spec: ana sayfada sakin bir
 * önizleme + "Detayları gör", asıl etkileşim kendi sayfasında daha çok yer
 * bulsun). Sol rail burada yok — o ana sayfanın 10 bölümlük yolculuğuna
 * özgü bir cihaz, buraya taşınmadı.
 */
export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/urunler/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);

  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

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
    <div className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
      <Link
        href="/#urunler"
        className="font-mono-data text-xs uppercase tracking-[0.06em] text-steel transition-colors hover:text-ahtapot"
      >
        ← {tProductUi("backToProducts")}
      </Link>

      <div className="mt-8 flex flex-col gap-4">
        <div className="h-6">
          {product.status === "in-development" && (
            <span className="w-fit border border-eosin px-2 py-0.5 font-mono-data text-[11px] uppercase tracking-[0.06em] text-eosin">
              {tProductUi("inDevelopmentBadge")}
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] md:text-5xl">
          {tProducts(`${slug}.name`)}
        </h1>
        <p className="max-w-2xl font-body text-lg text-foreground/80">
          {tProducts(`${slug}.tagline`)}
        </p>
        <LayerStrip activeLayers={product.layers} labels={layerLabels} />
      </div>

      <div className="mt-12">
        <ProductInteractionView product={product} />
      </div>

      {/* TODO(mock-data): açıklama + özellik listesi gerçek spesifikasyon
          değil, ekran görüntülerinden/verilen çerçeveden türetildi — bkz.
          docs/mock-data-todo.md. */}
      <div className="mt-16 grid gap-10 md:grid-cols-[3fr_2fr]">
        <p className="font-body text-lg leading-relaxed text-foreground">
          {tProducts(`${slug}.description`)}
        </p>
        <ul className="flex flex-col gap-3 border-t border-steel/20 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          {(tProducts.raw(`${slug}.features`) as string[]).map((feature) => (
            <li
              key={feature}
              className="font-mono-data text-sm text-foreground/80"
            >
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
