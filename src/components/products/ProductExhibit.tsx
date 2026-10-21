"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import type { AppLocale } from "@/i18n/routing";
import { localeHref } from "@/i18n/href";
import { PRODUCT_LAYERS, type ProductLayer } from "@/content/constants";
import type { Product } from "@/content/schema";
import { ProductInteractionView, type InteractionLabels } from "./ProductInteractionView";
import { useLenisContext } from "@/components/providers/LenisContext";
import { selectContactType } from "@/lib/contact/request";
import dynamic from "next/dynamic";
import type { CompareCopy } from "./ScopeCompare";

// Karşılaştırma ürünün altında: ilk yüklemeye girmesin.
const ScopeCompare = dynamic(() => import("./ScopeCompare").then((m) => m.ScopeCompare), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] bg-black" />,
});

export type ExhibitCopy = {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  /** assets.compare varsa: mikroskop ↔ dijital karşılaştırmasının metinleri. */
  compare?: CompareCopy;
};

export type ExhibitUi = {
  statusAvailable: string;
  inDevelopmentBadge: string;
  layersLabel: string;
  detailsCta: string;
  quoteCta: string;
  demoCta: string;
  featuresHeading: string;
  layerNames: Record<ProductLayer, string>;
  interaction: InteractionLabels;
};

type ProductExhibitProps = {
  locale: AppLocale;
  product: Product;
  copy: ExhibitCopy;
  ui: ExhibitUi;
  flip?: boolean;
  headingLevel?: "h1" | "h2" | "h3";
  showDetailsLink?: boolean;
};

/**
 * Tek ürün, ışıklı bir sergi objesi gibi. Her şey veriden türer: rozet
 * `status`'tan, etkileşim `interaction`'dan, katman satırı `layers`'tan.
 * Katman satırındaki bir katmanın üstüne gelince model o katmanı gösterir.
 */
export function ProductExhibit({
  locale,
  product,
  copy,
  ui,
  flip = false,
  headingLevel: Heading = "h3",
  showDetailsLink = true,
}: ProductExhibitProps) {
  const [active, setActive] = useState<ProductLayer | null>(null);
  const inDevelopment = product.status === "in-development";
  const requestType = inDevelopment ? "demo" : "urun-bilgisi";
  const { scrollToId } = useLenisContext();

  // Ana sayfada form aynı sayfada: konuyu seç, forma kaydır. Detay
  // sayfasında bağlantı ana sayfaya ?tur= ile gider.
  const onRequest = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!document.getElementById("iletisim")) return;
    e.preventDefault();
    selectContactType(requestType);
    scrollToId("iletisim");
  };

  return (
    <article id={`urun-${product.slug}`}>
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div data-reveal="" className={`lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
          <ProductInteractionView product={product} labels={ui.interaction} activeLayer={active} />
        </div>

        <div className={`lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
          <div data-reveal="">
            {inDevelopment ? (
              // Gizlenemez, küçültülemez, opsiyonel değildir.
              <span className="inline-flex items-center gap-2 bg-field px-3 py-1.5 text-small font-semibold text-field-ink">
                <span className="size-2 bg-eosin" aria-hidden="true" />
                {ui.inDevelopmentBadge}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-surface-2 px-3 py-1.5 text-small font-semibold text-ink">
                <span className="size-2 bg-accent" aria-hidden="true" />
                {ui.statusAvailable}
              </span>
            )}
            <div className="mt-6 border-l-[3px] border-brand pl-5">
              <Heading className="font-display text-[clamp(2.1rem,1.4rem+2vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance">
                {copy.name}
              </Heading>
              <p className="mt-4 text-lead leading-snug text-muted">{copy.tagline}</p>
            </div>
          </div>

          <div data-reveal="" className="mt-8">
            <p className="text-small text-muted">{ui.layersLabel}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {PRODUCT_LAYERS.map((layer) => {
                const included = product.layers.includes(layer);
                return (
                  <li key={layer}>
                    {included ? (
                      <button
                        type="button"
                        onPointerEnter={() => setActive(layer)}
                        onPointerLeave={() => setActive(null)}
                        onFocus={() => setActive(layer)}
                        onBlur={() => setActive(null)}
                        onClick={() => setActive((v) => (v === layer ? null : layer))}
                        aria-pressed={active === layer}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-small font-medium transition-colors duration-200 ${
                          active === layer ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink hover:bg-ink hover:text-ground"
                        }`}
                      >
                        <span className={`size-2 ${active === layer ? "bg-accent-ink" : "bg-accent"}`} aria-hidden="true" />
                        {ui.layerNames[layer]}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-2 text-small text-muted line-through decoration-muted/60">
                        {ui.layerNames[layer]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <p data-reveal="" className="mt-8 text-body text-ink/90">
            {copy.description}
          </p>

          <div data-reveal="" className="mt-8">
            <p className="text-small text-muted">{ui.featuresHeading}</p>
            <ul className="mt-3 grid gap-2">
              {copy.features.map((f) => (
                <li key={f} className="flex gap-3 text-body">
                  <span className="mt-[0.6em] size-1.5 shrink-0 bg-accent" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal="" className="mt-10 flex flex-wrap gap-3">
            <Link
              href={localeHref(locale, `/?tur=${requestType}#iletisim`)}
              onClick={onRequest}
              className="btn btn-primary group"
            >
              {inDevelopment ? ui.demoCta : ui.quoteCta}
              <Icon name="arrowRight" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            {showDetailsLink && (
              <Link href={localeHref(locale, `/urunler/${product.slug}`)} className="btn btn-quiet">
                {ui.detailsCta}
                <Icon name="arrowUpRight" className="size-4" strokeWidth={2} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Ürün verisinde karşılaştırma varsa (assets.compare): mikroskop ↔ dijital. */}
      {product.assets.compare && copy.compare ? (
        <div className="mt-[clamp(4rem,8vw,7rem)] grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div data-reveal="" className={`lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
            <ScopeCompare image={product.assets.compare} copy={copy.compare} />
          </div>
          <div data-reveal="" className={`lg:col-span-4 ${flip ? "lg:order-1" : "lg:col-start-9"}`}>
            <p className="font-display text-[clamp(1.5rem,1.1rem+1.2vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.03em]">
              {copy.compare.heading}
            </p>
            <p className="mt-4 max-w-[38ch] text-body leading-relaxed text-ink/90">{copy.compare.caption}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
