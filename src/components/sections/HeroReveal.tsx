"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsapSetup";
import { useLenisContext } from "@/components/providers/LenisContext";

type HeroEntry = { slug: string; name: string };

type HeroRevealProps = {
  eyebrow: string;
  heading: string;
  entries: HeroEntry[];
};

/**
 * Giriş sırası: eyebrow → başlık (SplitText, satır satır) → alttaki iki
 * giriş. Sakin easing (power2/3 out), sıçrama/elastic yok — "gösterişli
 * değil" (spec). Meander'ın kendisi burada animasyona karışmıyor; o
 * SiteRail'in işi, scroll'a bağlı (bkz. SiteRail.tsx) — hero yalnızca onun
 * başladığı nokta.
 */
export function HeroReveal({ eyebrow, heading, entries }: HeroRevealProps) {
  const { scrollToId } = useLenisContext();
  const rootRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const entriesRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const headingEl = headingRef.current;
      if (!headingEl) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          full: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          if (reduced) {
            gsap.set([eyebrowRef.current, entriesRef.current], {
              opacity: 1,
              y: 0,
            });
            return;
          }

          gsap.set(eyebrowRef.current, { opacity: 0, y: 8 });
          gsap.set(entriesRef.current, { opacity: 0, y: 8 });

          // autoSplit: font (Archivo, swap ile yükleniyor) geç gelirse
          // satır sınırları değişebilir — SplitText bunu algılayıp yeniden
          // bölüyor, animasyonu onSplit() içinde kurmak senkronu koruyor.
          const split = SplitText.create(headingEl, {
            type: "lines",
            autoSplit: true,
            onSplit(self) {
              return gsap
                .timeline()
                .to(eyebrowRef.current, {
                  opacity: 1,
                  y: 0,
                  duration: 0.4,
                  ease: "power2.out",
                })
                .from(
                  self.lines,
                  {
                    opacity: 0,
                    y: 14,
                    stagger: 0.08,
                    duration: 0.55,
                    ease: "power2.out",
                  },
                  "-=0.1"
                )
                .to(
                  entriesRef.current,
                  { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
                  "-=0.15"
                );
            },
          });

          return () => split.revert();
        }
      );

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      id="hero"
      ref={rootRef}
      className="flex min-h-[70vh] flex-col justify-center gap-8 py-24 md:min-h-screen"
    >
      <p
        ref={eyebrowRef}
        className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel"
      >
        {eyebrow}
      </p>
      <h1
        ref={headingRef}
        className="max-w-3xl font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.01em] md:text-[64px] md:leading-[1.06] md:tracking-[-0.015em]"
        style={{ fontVariationSettings: "'wdth' 125" }}
      >
        {heading}
      </h1>
      <div ref={entriesRef} className="flex flex-wrap gap-8 pt-2">
        {entries.map((entry) => (
          <a
            key={entry.slug}
            href={`#${entry.slug}`}
            onClick={(event) => {
              event.preventDefault();
              scrollToId(entry.slug);
            }}
            className="group flex items-center gap-2 font-mono-data text-xs uppercase tracking-[0.06em] text-steel transition-colors hover:text-ahtapot"
          >
            {entry.name}
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-y-0.5"
            >
              ↓
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
