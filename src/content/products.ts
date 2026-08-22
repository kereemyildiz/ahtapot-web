import "server-only";
import fs from "node:fs";
import path from "node:path";
import { productSchema, type Product } from "./schema";

const PRODUCTS_DIR = path.join(process.cwd(), "content", "products");

/**
 * content/products/*.json içindeki her dosyayı okur ve doğrular.
 * Üçüncü bir ürün eklemek için tek gereken şey bu klasöre bir JSON dosyası
 * daha koymak — kod değişikliği gerekmiyor.
 */
function loadProducts(): Product[] {
  const files = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((file) => file.endsWith(".json"));

  const products = files.map((file) => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS_DIR, file), "utf-8")
    );
    const result = productSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `content/products/${file} şemayla uyuşmuyor: ${result.error.message}`
      );
    }
    return result.data;
  });

  return products.sort((a, b) => a.order - b.order);
}

// Modül seviyesinde bir kez okunur (dev'de her sıcak yenilemede,
// build'de bir kez) — sonrasında bellekten servis edilir.
const products = loadProducts();

export function getProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}
