"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import { buildMiniKinkPath } from "@/components/meander/kinkPath";

export type LayerBeatItem = {
  id: string;
  label: string;
  sentence: string;
};

const GLYPH_SIZE = 20;
const GLYPH_WIDTH = GLYPH_SIZE * 0.7;

/**
 * Katman anlatısı jenerik infografiğe değil, meander'ın kendi modülüne
 * dayanıyor: her beat'in ikonu ana rail'in aynı kink glyph'i
 * (buildMiniKinkPath — bkz. ProductCard'ın mini layer-strip'i, aynı
 * fonksiyon üçüncü kez kullanılıyor). Görsel yok, tek bir gerçek cümle var
 * (spec: "jenerik infografik yapma, çizgiden türet").
 */
export function LayerBeats({ items }: { items: LayerBeatItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glyphPath = buildMiniKinkPath(GLYPH_SIZE);

  useGSAP(
    () => {
      const beats = gsap.utils.toArray<HTMLElement>(
        ".layer-beat",
        rootRef.current
      );

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          full: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          beats.forEach((beat) => {
            if (reduced) {
              gsap.set(beat, { opacity: 1, y: 0 });
              return;
            }
            gsap.set(beat, { opacity: 0, y: 24 });
            gsap.to(beat, {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: {
                trigger: beat,
                start: "top 80%",
                toggleActions: "play none none none",
              },
            });
          });
        }
      );

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="flex flex-col">
      {items.map((item) => (
        <div
          key={item.id}
          id={item.id}
          className="layer-beat flex min-h-[40vh] scroll-mt-6 flex-col justify-center gap-4 border-t border-steel/20 py-10 md:min-h-[42vh] md:flex-row md:items-center md:gap-12"
        >
          <div className="flex items-center gap-3 md:w-[35%]">
            <svg
              width={GLYPH_WIDTH}
              height={GLYPH_SIZE}
              viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_SIZE}`}
              aria-hidden="true"
            >
              <path
                d={glyphPath}
                fill="none"
                stroke="var(--color-ahtapot)"
                strokeWidth={2}
              />
            </svg>
            <h2 className="font-mono-data text-sm uppercase tracking-[0.06em] text-steel">
              {item.label}
            </h2>
          </div>
          <p className="font-body text-xl leading-snug text-foreground md:w-[65%] md:text-2xl">
            {item.sentence}
          </p>
        </div>
      ))}
    </div>
  );
}
