import type { Product } from "@/content/schema";

export type ProductGridRow =
  | { kind: "pair"; items: [Product, Product] }
  // Çift olmayan, öne çıkarılmamış ürün: kendi kolon genişliğini korur,
  // yanındaki hücre boş kalır (bkz. spec §3).
  | { kind: "orphan"; item: Product }
  // Product.featured === true: dizi paritesinden bağımsız, kendi isteğiyle
  // tam genişlik.
  | { kind: "featured"; item: Product };

/**
 * Ürünleri her zaman 2 eşit kolonluk satırlara böler. Layout niyeti
 * `featured` alanından gelir, dizi konumundan değil — bkz. spec §3.
 */
export function buildProductGrid(products: Product[]): ProductGridRow[] {
  const rows: ProductGridRow[] = [];
  let pending: Product | null = null;

  const flushPending = () => {
    if (pending) {
      rows.push({ kind: "orphan", item: pending });
      pending = null;
    }
  };

  for (const product of products) {
    if (product.featured) {
      flushPending();
      rows.push({ kind: "featured", item: product });
      continue;
    }
    if (pending) {
      rows.push({ kind: "pair", items: [pending, product] });
      pending = null;
    } else {
      pending = product;
    }
  }
  flushPending();

  return rows;
}
