import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getProducts } from "@/content/products";
import { ProductExhibit } from "@/components/products/ProductExhibit";
import { getExhibitCopy, getExhibitUi } from "@/components/products/productLabels";
import { ScrubText } from "@/components/motion/ScrubText";
import { SectionRule } from "@/components/motion/SectionRule";
import { Words } from "@/components/motion/Words";

/**
 * Ürünler eşit ağırlıkta, content/products/*.json'dan render edilir.
 * Üçüncü ürün = bir JSON dosyası + görseller; sergiler sırayla yön değiştirir.
 */
export async function Products() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("product");
  const products = getProducts();
  const ui = await getExhibitUi();
  const copies = await Promise.all(products.map((p) => getExhibitCopy(p)));

  return (
    <section id="urunler" aria-labelledby="urunler-title" className="frame py-[clamp(7rem,14vw,13rem)]">
      <SectionRule />
      <div className="grid gap-6 lg:grid-cols-12">
        <h2 id="urunler-title" data-split="" className="section-title lg:col-span-6">
          <Words text={t("heading")} />
        </h2>
        <div className="lg:col-span-5 lg:col-start-8 lg:self-end">
          <ScrubText className="max-w-[36ch] text-lead leading-snug text-ink" text={t("intro")} />
        </div>
      </div>

      <div className="mt-[clamp(4rem,8vw,7rem)] flex flex-col gap-[clamp(6rem,12vw,11rem)]">
        {products.map((product, i) => {
          const { screens, ...copy } = copies[i];
          return (
            <ProductExhibit
              key={product.slug}
              locale={locale}
              product={product}
              copy={copy}
              ui={{ ...ui, interaction: { ...ui.interaction, screens } }}
              flip={i % 2 === 1}
            />
          );
        })}
      </div>
    </section>
  );
}
