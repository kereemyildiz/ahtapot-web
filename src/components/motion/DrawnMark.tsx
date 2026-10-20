"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import { LogoMark } from "@/components/brand/LogoMark";

/**
 * Logodaki meander, görünüme girince tek çizgi olarak kendini çizer:
 * önce elmas, sonra bacaklar. Sayfanın tek fikri (tek sürekli çizgi)
 * kapanışta bir kez daha.
 */
export function DrawnMark({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-logo-path]", {
          drawSVG: "0%",
          duration: 1.1,
          ease: "power2.inOut",
          stagger: 0.18,
          scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      <LogoMark className="h-full w-auto" strokeWidth={30} gradientId="logo-drawn" />
    </div>
  );
}
