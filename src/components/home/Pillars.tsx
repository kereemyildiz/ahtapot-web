"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";

type Pillar = { title: string; text: string };

/**
 * Hakkımızda'daki üç ilke tek bir çizgiyle bağlı: kaydırdıkça uzar (scrub),
 * her ilkeye ulaşınca düğümü yanar. Kaydırma yalnız çizgiyi ve düğümleri
 * sürer; ilkenin metni düğümü ilk yandığında bir kez belirir ve kalır
 * (yukarı kaydırınca kaybolmaz). Yetkinliklerdeki ilerleme çizgisiyle aynı
 * dil. Masaüstünde yatay, mobilde dikey.
 * Reduced motion'da çizgi tam, düğümler yanık, metin görünür.
 */
export function Pillars({ pillars }: { pillars: Pillar[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const build = (axis: "x" | "y", ctx: gsap.Context) => {
        const box = root.current;
        if (!box) return;
        const items = gsap.utils.toArray<HTMLElement>("[data-pillar]");
        const texts = items.map((item) => item.querySelectorAll("[data-pillar-text]"));
        // Düğüm, çizginin ucu ona ulaşınca yanar: konumu ilkenin gerçek
        // yerinden (mobilde son ilke de ekranın alt dörtte birinde yanar).
        const at = items.map((item) =>
          axis === "x" ? item.offsetLeft / box.offsetWidth : item.offsetTop / box.offsetHeight
        );
        // "Bir kez belirdi" bayrakları efektin içinde (StrictMode ikinci
        // kurulumda başlangıç durumunu yeniden uygular).
        const shown = items.map(() => false);
        gsap.set(texts, { autoAlpha: 0, y: 12 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: box, start: "top 80%", end: axis === "x" ? "top 40%" : "bottom 70%", scrub: 0.6 },
          // Scrub'ın yetiştiği an (görünen düğümle aynı kare) metni bir kez açar.
          onUpdate(this: gsap.core.Timeline) {
            const p = this.progress();
            at.forEach((a, i) => {
              if (shown[i] || p < Math.max(a, 0.001)) return;
              shown[i] = true;
              ctx.add(() =>
                gsap.to(texts[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.08, overwrite: true })
              );
            });
          },
        });
        tl.from("[data-pillar-line]", axis === "x" ? { scaleX: 0, duration: 1 } : { scaleY: 0, duration: 1 }, 0);
        items.forEach((item, i) => {
          tl.fromTo(item.querySelector("[data-pillar-node]"), { "--on": 0 }, { "--on": 1, duration: 0.04 }, Math.min(at[i], 0.96));
        });
      };
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", (ctx) => build("x", ctx));
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", (ctx) => build("y", ctx));
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
