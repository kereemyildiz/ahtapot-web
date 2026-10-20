"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";

/**
 * Okudukça yanan paragraf: kelimeler ikincil mürekkepten tam mürekkebe,
 * kaydırmayla birlikte geçer. Kelimeler sunucuda <span>'lere bölünür
 * (SplitText paketi gerekmez). İkincil mürekkep tek başına da AA kontrastlı;
 * script çalışmazsa metin tam mürekkepte durur.
 */
export function ScrubText({
  text,
  lead,
  className,
}: {
  text: string;
  lead?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-word]",
          { color: "#a2a8bc" },
          {
            color: "#eef0f6",
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom 45%", scrub: true },
          }
        );
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  const words = text.split(/\s+/);
  return (
    <p ref={ref} className={className}>
      {lead}
      {words.map((word, i) => (
        <span key={i} data-word="">
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
