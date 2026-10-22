"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";

type Pillar = { title: string; text: string };

/**
 * Hakkımızda'daki üç ilke tek bir çizgiyle bağlı: kaydırdıkça uzar (scrub),
 * her ilkeye ulaşınca düğümü yanar ve metni belirir. Yetkinliklerdeki
 * ilerleme çizgisiyle aynı dil. Masaüstünde yatay, mobilde dikey.
 * Reduced motion'da çizgi tam, düğümler yanık, metin görünür.
 */
export function Pillars({ pillars }: { pillars: Pillar[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const build = (axis: "x" | "y") => {
        const items = gsap.utils.toArray<HTMLElement>("[data-pillar]");
        const step = 1 / items.length;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top 80%", end: axis === "x" ? "top 40%" : "bottom 70%", scrub: 0.6 },
        });
        tl.from("[data-pillar-line]", axis === "x" ? { scaleX: 0, duration: 1 } : { scaleY: 0, duration: 1 }, 0);
        items.forEach((item, i) => {
          const at = i * step;
          tl.fromTo(
            item.querySelector("[data-pillar-node]"),
            { "--on": 0 },
            { "--on": 1, duration: 0.04 },
            at
          ).from(item.querySelectorAll("[data-pillar-text]"), { autoAlpha: 0, y: 16, duration: step * 0.8, stagger: step * 0.15 }, at);
        });
      };
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => build("x"));
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => build("y"));
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative mt-[clamp(4rem,8vw,7rem)]">
      {/* İz ve üstünde uzayan çizgi: mobilde solda dikey, masaüstünde üstte yatay. */}
      <div aria-hidden="true" className="absolute bottom-0 left-[7px] top-0 w-[2px] bg-periwinkle/20 md:inset-x-0 md:bottom-auto md:left-0 md:h-[2px] md:w-auto" />
      <div
        data-pillar-line=""
        aria-hidden="true"
        className="absolute bottom-0 left-[7px] top-0 w-[2px] origin-top bg-periwinkle md:inset-x-0 md:bottom-auto md:left-0 md:h-[2px] md:w-auto md:origin-left"
      />
      <ul className="grid gap-12 md:grid-cols-3 md:gap-8">
        {pillars.map((p) => (
          <li key={p.title} data-pillar="" className="relative pl-10 md:pl-0 md:pt-10">
            <span
              data-pillar-node=""
              aria-hidden="true"
              className="pillar-node absolute left-0 top-1 size-4 border-2 md:-top-[7px]"
            />
            <h3 data-pillar-text="" className="font-display text-[clamp(1.2rem,1rem+0.6vw,1.6rem)] font-medium leading-[1.15] tracking-[-0.02em]">
              {p.title}
            </h3>
            <p data-pillar-text="" className="mt-3 max-w-[38ch] text-body text-ink/85">
              {p.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
