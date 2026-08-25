import { getTranslations } from "next-intl/server";
import { getProducts } from "@/content/products";
import { HeroReveal } from "./HeroReveal";

/**
 * Hero sakin — büyük jest yok. Tek iş: ne yaptığımızı düz cümleyle
 * söylemek ve meanderin çizilmeye başladığı yeri işaretlemek. "Wow anı"
 * burada değil — meander sisteminde ve ürün etkileşimlerinde (spec §6).
 *
 * Alttaki iki giriş ürünlerden türüyor (hardcoded "iki" değil) — üçüncü
 * ürün eklenince kod değişmeden üçe çıkar.
 */
export async function Hero() {
  const t = await getTranslations("hero");
  const tProducts = await getTranslations("products");
  const products = getProducts();

  const entries = products.map((product) => ({
    slug: product.slug,
    name: tProducts(`${product.slug}.name`),
  }));

  return (
    <HeroReveal eyebrow={t("eyebrow")} heading={t("heading")} entries={entries} />
  );
}
