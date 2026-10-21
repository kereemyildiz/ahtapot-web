import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { getProductBySlug, getProducts } from "@/content/products";
import Link from "next/link";
import { localeHref } from "@/i18n/href";
import { PageMotion } from "@/components/motion/PageMotion";
import { ProductExhibit } from "@/components/products/ProductExhibit";
import { getExhibitCopy, getExhibitUi } from "@/components/products/productLabels";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getProducts().map((p) => ({ locale, slug: p.slug })));
}

// Ürünler build sırasında belli; bilinmeyen slug render edilmeden 404 olur.
// Cloudflare Worker'da dosya sistemi yok: products.ts çalışma anında yüklenirse 500 verir.
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/urunler/[slug]">) {
  const { locale, slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "products" });
  const tMeta = await getTranslations({ locale: locale as AppLocale, namespace: "meta" });
  return { title: `${t(`${slug}.name`)} · ${tMeta("siteTitle")}`, description: t(`${slug}.tagline`) };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/urunler/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const t = await getTranslations("product");
  const ui = await getExhibitUi();
  const { screens, ...copy } = await getExhibitCopy(product);
  const others = getProducts().filter((p) => p.slug !== slug);
  const tProducts = await getTranslations("products");

  return (
    <main className="frame pb-[clamp(5rem,10vw,9rem)] pt-[calc(var(--header-h)+clamp(2rem,5vw,4rem))]">
      <PageMotion>
        <Link href={localeHref(locale as AppLocale, "/#urunler")} className="text-small text-muted transition-colors hover:text-ink">
          ← {t("backToProducts")}
        </Link>

        <div className="mt-10">
          <ProductExhibit
            locale={locale as AppLocale}
            product={product}
            copy={copy}
            ui={{ ...ui, interaction: { ...ui.interaction, screens } }}
            headingLevel="h1"
            showDetailsLink={false}
          />
        </div>

        {product.assets.gallery.length > 0 && (
          <section aria-labelledby="ekranlar" className="mt-[clamp(5rem,10vw,9rem)]">
            <h2 id="ekranlar" data-split="" className="section-title">
              {t("screensHeading")}
            </h2>
            <div className="mt-12 grid gap-10 lg:grid-cols-2">
              {product.assets.gallery.map((img, i) => (
                <figure key={img.src} data-reveal="">
                  <div className="relative overflow-hidden bg-surface" style={{ aspectRatio: `${img.width} / ${img.height}` }}>
                    <Image src={img.src} alt={screens[i] ?? ""} fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
                  </div>
                  {screens[i] && <figcaption className="mt-4 text-body text-ink/90">{screens[i]}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <nav aria-label={t("heading")} className="mt-[clamp(5rem,10vw,9rem)] flex flex-wrap gap-3">
            {others.map((p) => (
              <Link key={p.slug} href={localeHref(locale as AppLocale, `/urunler/${p.slug}`)} className="btn btn-quiet">
                {tProducts(`${p.slug}.name`)} →
              </Link>
            ))}
          </nav>
        )}
      </PageMotion>
    </main>
  );
}
