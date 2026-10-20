"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import { LenisContext } from "./LenisContext";
import { usePathname } from "next/navigation";

/**
 * Lenis + GSAP ScrollTrigger senkronizasyonu. Atlanırsa ScrollTrigger kayar.
 * `prefers-reduced-motion` açıksa Lenis kurulmaz; tarayıcının kendi scroll'u
 * kalır. Scroll-jack yok: kullanıcı kontrolü hiçbir an kaybetmez.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  // Route değişince sayfa yüksekliği değişir; Lenis ve ScrollTrigger
  // yeniden ölçmezse eski sınırda takılı kalır.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      lenisRef.current?.resize();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.11 });
    lenisRef.current = lenis;
    const onTick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Fontlar geç yüklenince satır yükseklikleri değişir; tetikleyicileri tazele.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToId = useCallback((id: string) => {
    const header = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4.5;
    const target = id === "top" ? 0 : document.getElementById(id);
    if (target === null) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: id === "top" ? 0 : -header, duration: 1.2 });
      return;
    }
    if (target === 0) {
      window.scrollTo({ top: 0 });
      return;
    }
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header });
  }, []);

  return (
    <LenisContext.Provider value={{ lenisRef, scrollToId }}>{children}</LenisContext.Provider>
  );
}
