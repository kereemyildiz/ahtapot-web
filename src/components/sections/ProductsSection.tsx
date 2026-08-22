import { getTranslations } from "next-intl/server";
import { getProducts } from "@/content/products";
import { buildProductGrid } from "@/lib/productGrid";
import { ProductCard } from "@/components/products/ProductCard";

/**
 * Her zaman 2 eşit kolon (spec §3). Şu an 2 ürün var → tek "pair" satırı;
 * "orphan"/"featured" yolları kodda doğru ama gerçek 3. ürün gelmeden
 * fiilen tetiklenmiyor (uydurma ürünle doldurulmadı).
 */
export async function ProductsSection() {
  const t = await getTranslations("nav.sections");
  const products = getProducts();
  const rows = buildProductGrid(products);

  return (
    <section
      id="urunler"
      className="flex flex-col gap-10 border-t border-steel/20 py-24"
    >
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("urunler")}
      </p>
      <div className="flex flex-col gap-6">
        {rows.map((row) => {
          if (row.kind === "pair") {
            return (
              <div
                key={row.items[0].slug}
                className="grid gap-6 md:grid-cols-2"
              >
                <ProductCard product={row.items[0]} variant="paired" />
                <ProductCard product={row.items[1]} variant="paired" />
              </div>
            );
          }
          if (row.kind === "featured") {
            return (
              <div key={row.item.slug} className="grid">
                <ProductCard product={row.item} variant="single" />
              </div>
            );
          }
          // orphan: kolon genişliğini koruyor, sibling hücre bilinçli boş
          // (veri varsa kapanış cümlesi taşıyacak — henüz o alan yok).
          return (
            <div key={row.item.slug} className="grid gap-6 md:grid-cols-2">
              <ProductCard product={row.item} variant="paired" />
              <div
                className="hidden border border-dashed border-steel/20 md:block"
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
