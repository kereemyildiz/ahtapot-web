import { getTranslations } from "next-intl/server";
import { PRODUCT_LAYERS } from "@/content/constants";
import { HeroNetwork } from "./HeroNetwork";

export async function Hero() {
  const t = await getTranslations("hero");
  const tLayers = await getTranslations("layers");

  const nodes = PRODUCT_LAYERS.map((layer) => ({
    layer,
    name: tLayers(layer),
    detail: t(`callouts.${layer}`),
  }));

  return (
    <section
      id="top"
      className="relative flex flex-col pt-[var(--header-h)] lg:block lg:h-[100svh] lg:min-h-[44rem]"
    >
      {/* Sol panel: logodaki ahtapot ve dört kolu. */}
      <div className="relative mx-[var(--gutter)] h-[46svh] min-h-[20rem] bg-surface lg:absolute lg:bottom-[var(--gutter)] lg:left-0 lg:top-[var(--header-h)] lg:m-0 lg:ml-[var(--gutter)] lg:h-auto lg:w-[49%]">
        <HeroNetwork label={t("visualAlt")} nodes={nodes} />
      </div>

      <div className="frame relative z-10 mb-16 mt-8 lg:absolute lg:right-0 lg:top-1/2 lg:mb-0 lg:mt-0 lg:w-[47%] lg:-translate-y-1/2 lg:pl-[3vw]">
        <h1 className="hero-rise display max-w-[14ch] text-[clamp(2.4rem,1.2rem+3.6vw,4.6rem)] text-balance">
          {t("title")}
        </h1>
        <p className="hero-rise mt-8 max-w-[36ch] text-lead leading-snug text-ink/90">
          {t("lead")}
        </p>
        <div className="hero-rise mt-10 flex flex-wrap gap-3">
          <a href="#iletisim" className="btn btn-primary">
            {t("primaryCta")}
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 8h11M9 4l4 4-4 4" />
            </svg>
          </a>
          <a href="#urunler" className="btn btn-quiet">
            {t("secondaryCta")}
          </a>
        </div>
      </div>
    </section>
  );
}
