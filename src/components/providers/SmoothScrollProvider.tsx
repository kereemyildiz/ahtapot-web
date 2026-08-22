"use client";

import { useCallback, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import { LenisContext } from "./LenisContext";

/**
 * Lenis + GSAP ScrollTrigger senkronizasyonu (CLAUDE.md'deki snippet birebir).
 * Atlanırsa ScrollTrigger kayar. `prefers-reduced-motion` açıksa Lenis hiç
 * kurulmuyor — tarayıcının native scroll'u devam ediyor, hiçbir içerik
 * erişilemez hale gelmiyor. Lenis instance'ı context ile aşağı taşınıyor ki
 * rail etiketleri tıklanınca kaydırma buradan çalışsın.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis();
    lenisRef.current = lenis;

    const onTick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToId = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -16, duration: 1.1 });
      return;
    }

    // Lenis yok (reduced motion) — native, animasyonsuz kaydırma.
    target.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  return (
    <LenisContext.Provider value={{ lenisRef, scrollToId }}>
      {children}
    </LenisContext.Provider>
  );
}
