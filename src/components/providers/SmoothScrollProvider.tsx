"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import { LenisContext } from "./LenisContext";
import { usePathname } from "@/i18n/navigation";

/**
 * Lenis + GSAP ScrollTrigger senkronizasyonu (CLAUDE.md'deki snippet birebir).
 * Atlanırsa ScrollTrigger kayar. `prefers-reduced-motion` açıksa Lenis hiç
 * kurulmuyor — tarayıcının native scroll'u devam ediyor, hiçbir içerik
 * erişilemez hale gelmiyor. Lenis instance'ı context ile aşağı taşınıyor ki
 * rail etiketleri tıklanınca kaydırma buradan çalışsın.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  // Lenis (ve ScrollTrigger'ın kendi ölçümleri) sayfanın YÜKSEKLİĞİNİ
  // ilk kurulumda ölçüyor. Next.js layout, iki route arasında (ör.
  // /urunler/su-banyosu -> /#urunler) aynı kalıp — Lenis instance'ı
  // yeniden kurulmuyor, ama sayfa içeriği (dolayısıyla yüksekliği)
  // tamamen değişiyor. resize() çağrılmazsa Lenis eski (kısa) sayfanın
  // sınırını hatırlıyor ve tekerlek çevirince hiç kaymıyor — "detay
  // sayfasından dönünce scroll çalışmıyor" bug'ının kök sebebi buydu.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      lenisRef.current?.resize();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

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
