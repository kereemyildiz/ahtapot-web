"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";

/**
 * Sayfadaki ortak giriş hareketleri tek yerden:
 * - [data-reveal]: bölüm girerken 24px yükselip belirir, 70ms arayla.
 * - [data-split]: başlık kelime kelime maskesinden yükselir (Words); kelimeye
 *   bölünmemişse alttan açılan bir perdeyle.
 * Reduced motion'da hiçbiri çalışmaz; CSS içeriği görünür bırakır.
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
          const words = el.querySelectorAll("[data-word]");
          // Sunucuda kelimelere bölünmüş başlık (Words): her kelime kendi
          // maskesinden, hafif dönerek sırayla yükselir.
          if (words.length) {
            gsap.from(words, {
              yPercent: 115,
              rotate: 4,
              transformOrigin: "0% 100%",
              duration: 1,
              ease: "expo.out",
              stagger: 0.06,
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            });
            return;
          }
          gsap.from(el, {
            clipPath: "inset(0% 0% 100% 0%)",
            yPercent: 35,
            duration: 1,
            ease: "expo.out",
            clearProps: "clipPath",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        ScrollTrigger.batch("[data-reveal]", {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out",
              stagger: 0.07,
              overwrite: true,
            }),
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-reveal]", { autoAlpha: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return <div ref={root}>{children}</div>;
}
