"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import { pulseDash } from "@/lib/svgPath";
import { useOffscreenPause } from "@/lib/useOffscreenPause";

// Stetoskop: kulaklıklar, Y birleşimi ve göğüs başlığına inen hortum
// (yumuşak eğriler: hekimlik). Göğüs başlığından çıkan iz dik açılarla
// kıvrılıp bir çipe bağlanır (logodaki meander dili: mühendislik).
const EARPIECES = "M122 46 L138 54 M278 46 L262 54";
const BINAURALS = "M138 54 C150 120 170 150 200 176 M262 54 C250 120 230 150 200 176";
const TUBE = "M200 176 C200 236 120 220 104 270";
const TRACE = "M128 300 H176 V250 H232 V318 H286";
const CHIP_PINS = "M296 300 H286 M296 318 H286 M296 336 H286 M356 300 H366 M356 318 H366 M356 336 H366 M308 288 V278 M326 288 V278 M344 288 V278 M308 348 V358 M326 348 V358 M344 348 V358";
const PULSE = pulseDash(TRACE, 0.14);

/**
 * Kurucu bloğunun görseli: stetoskobun hortumu göğüs başlığından sonra
 * bir devre izine dönüşüp çipe bağlanır. Görünüme girince kendini çizer,
 * sonra izden periyodik bir sinyal geçer.
 * TODO(mock-data): gerçek portre gelince yerine konabilir.
 */
export function FounderMark({ label }: { label: string }) {
  const root = useRef<HTMLDivElement>(null);
  useOffscreenPause(root);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top 75%", once: true } })
          .from("[data-founder-scope]", { drawSVG: "0%", duration: 1.1, stagger: 0.15, ease: "power2.inOut" })
          .from("[data-founder-head]", { scale: 0.6, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2)" }, "-=0.3")
          .from("[data-founder-trace]", { drawSVG: "0%", duration: 0.9, ease: "power2.inOut" }, "-=0.1")
          .from("[data-founder-chip]", { autoAlpha: 0, scale: 0.85, transformOrigin: "50% 50%", duration: 0.45, ease: "power2.out" }, "-=0.2")
          .from("[data-founder-pulse]", { autoAlpha: 0, duration: 0.3 });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface p-[8%]">
      <div aria-hidden="true" className="hero-glow absolute inset-0" />
      <svg viewBox="60 20 330 360" className="relative h-full w-full" role="img" aria-label={label} fill="none" strokeLinecap="round">
        <g stroke="var(--color-periwinkle)" strokeWidth="7">
          <path data-founder-scope="" d={EARPIECES} />
          <path data-founder-scope="" d={BINAURALS} />
          <path data-founder-scope="" d={TUBE} />
        </g>
        {/* Göğüs başlığı. */}
        <g data-founder-head="">
          <circle cx="104" cy="300" r="26" stroke="var(--color-periwinkle)" strokeWidth="7" />
          <circle cx="104" cy="300" r="12" stroke="var(--color-periwinkle)" strokeWidth="3" opacity="0.6" />
        </g>
        {/* Başlıktan çıkan devre izi, vialar ve çip. */}
        <g strokeLinecap="square">
          <path data-founder-trace="" d={TRACE} stroke="var(--color-accent)" strokeWidth="6" />
          <g data-founder-chip="">
            <rect x="296" y="288" width="60" height="60" stroke="var(--color-accent)" strokeWidth="6" />
            <path d={CHIP_PINS} stroke="var(--color-accent)" strokeWidth="4" />
            <circle cx="176" cy="250" r="7" fill="var(--color-ground)" stroke="var(--color-accent)" strokeWidth="4" />
            <circle cx="232" cy="318" r="7" fill="var(--color-ground)" stroke="var(--color-accent)" strokeWidth="4" />
          </g>
          <path
            data-founder-pulse=""
            d={TRACE}
            strokeDasharray={PULSE.strokeDasharray}
            stroke="var(--color-ink)"
            strokeWidth="8"
            className="pulse"
            style={{ ...PULSE.style, animationDuration: "2.2s" }}
          />
        </g>
      </svg>
    </div>
  );
}
