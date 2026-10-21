"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import { useLenisContext } from "@/components/providers/LenisContext";

/**
 * Talep gönderildi: formun yerini alan onay. Form ~700px kısaldığı için
 * panel görünmüyorsa ekrana kaydırılır ve odak ona taşınır (gönder düğmesi
 * DOM'dan çıktı). Giriş: perde alttan açılır, onay işareti kendini çizer.
 */
export function ContactSuccess({ title, body }: { title: string; body: string }) {
  const root = useRef<HTMLDivElement>(null);
  const { lenisRef } = useLenisContext();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      el.focus({ preventScroll: true });

      const header = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4.5;
      const r = el.getBoundingClientRect();
      if (r.top < header || r.bottom > window.innerHeight) {
        if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -header - 24, duration: 0.8 });
        else window.scrollTo({ top: r.top + window.scrollY - header - 24 });
      }

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline()
          .from(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.6, ease: "expo.out", clearProps: "clipPath" })
          .from("[data-success-mark]", { drawSVG: "0%", duration: 0.5, ease: "power2.inOut", stagger: 0.12 }, "-=0.35")
          .from("[data-success-text]", { autoAlpha: 0, y: 12, duration: 0.45, ease: "expo.out", stagger: 0.06 }, "-=0.45");
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      role="status"
      tabIndex={-1}
      className="flex items-start gap-[clamp(1rem,3vw,2rem)] bg-surface p-[clamp(1.5rem,4vw,3rem)] outline-none"
    >
      {/* Logodaki dik açılı çizgi diliyle onay: kare çerçeve + tik. */}
      <svg viewBox="0 0 48 48" className="size-[clamp(2.5rem,2rem+2vw,3.5rem)] shrink-0" fill="none" strokeLinecap="square" aria-hidden="true">
        <path data-success-mark="" d="M3 3 H45 V45 H3 Z" stroke="var(--color-periwinkle)" strokeWidth="3" />
        <path data-success-mark="" d="M13 25 L21 33 L36 16" stroke="var(--color-accent)" strokeWidth="4" />
      </svg>
      <div>
        <p data-success-text="" className="font-display text-[clamp(1.6rem,1.1rem+1.5vw,2.6rem)] font-medium tracking-[-0.03em]">
          {title}
        </p>
        <p data-success-text="" className="mt-3 text-lead text-ink/90">
          {body}
        </p>
      </div>
    </div>
  );
}
