"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";

/**
 * Bölüm açılışı: logodaki ahtapotun başı (elmas) ve bir kancası kendini
 * çizer, ardından çizgi bölüm boyunca uzanır. Sitenin tek çizgisinin her
 * bölümde yeniden başladığı yer. Kaydırmaya bağlı (scrub), pin yok.
 */
export function SectionRule() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top 92%", end: "top 50%", scrub: 0.6 } })
          .from("[data-rule-path]", { drawSVG: "0%", ease: "none", stagger: 0.15, duration: 0.4 })
          .from("[data-rule-line]", { scaleX: 0, ease: "none", duration: 1 }, ">-0.05");
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} aria-hidden="true" className="mb-[clamp(2.5rem,5vw,4rem)] flex h-10 items-center">
      <svg viewBox="0 0 72 40" className="h-10 w-[4.5rem] shrink-0 overflow-visible" fill="none" strokeLinecap="square">
        <path data-rule-path="" d="M14 10 L24 20 L14 30 L4 20 Z" stroke="var(--color-periwinkle)" strokeWidth="3" />
        <path data-rule-path="" d="M24 20 H38 V6 H58 V34 H46 V20 H72" stroke="var(--color-periwinkle)" strokeWidth="3" />
      </svg>
      <div
        data-rule-line=""
        className="h-[3px] flex-1 origin-left bg-[linear-gradient(90deg,var(--color-periwinkle),rgb(147_164_244/0.25)_45%,transparent)]"
      />
    </div>
  );
}
