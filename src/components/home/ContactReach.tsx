"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import { replayOnView } from "@/lib/replayOnView";
import { LogoMark, LOGO_BLUES } from "@/components/brand/LogoMark";
import { Icon, type IconName } from "@/components/brand/Icon";
import { pulseDash } from "@/lib/svgPath";
import { useOffscreenPause } from "@/lib/useOffscreenPause";

export type ReachRow = { icon: IconName; label: string; lines: string[]; href?: string };

/**
 * Sayfanın kapanışı: hero'da kollar disiplinlere uzanıyordu, burada aynı
 * ahtapotun kolları iletişim satırlarına uzanır. Kollar satırların gerçek
 * konumundan hesaplanır (metin kayınca, ekran değişince kopmaz). Görünüme
 * her girişte logo ve kollar yeniden çizilir; kollarda sinyal akar, bir
 * satırın üstüne gelince (ya da bağlantısı odaklanınca) o kol yanar.
 */
export function ContactReach({ rows, brand }: { rows: ReachRow[]; brand: { name: string; sub: string } }) {
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  useOffscreenPause(root);

  useLayoutEffect(() => {
    const el = root.current;
    const mark = logo.current;
    if (!el || !mark) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const m = mark.getBoundingClientRect();
      // Gövde logonun iki iç bacağının arasından çıkar, dik açılarla satıra döner.
      const x0 = Math.round(m.left - box.left + m.width / 2);
      const y0 = Math.round(m.bottom - box.top + 6);
      setPaths(
        dots.current.map((dot) => {
          if (!dot) return "";
          const r = dot.getBoundingClientRect();
          const y = Math.round(r.top - box.top + r.height / 2);
          const x = Math.round(r.left - box.left - 8);
          return `M${x0} ${y0} V${y} H${x}`;
        })
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length]);

  const ready = paths.length > 0 && paths.every(Boolean);

  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap
          .timeline({ paused: true })
          .from("[data-logo-path]", { drawSVG: "0%", duration: 0.8, stagger: 0.1, ease: "power2.inOut" })
          .from("[data-reach-brand]", { autoAlpha: 0, x: -12, duration: 0.6, ease: "expo.out" }, "-=0.4")
          .from("[data-reach-arm]", { drawSVG: "0%", duration: 0.6, stagger: 0.12, ease: "power2.inOut" }, "-=0.25")
          .from("[data-reach-dot]", { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.12, ease: "expo.out" }, "-=0.45")
          .from("[data-reach-pulse]", { autoAlpha: 0, duration: 0.3 });
        // Kurucu görseli gibi: bölüme her girişte yeniden çizilir.
        return root.current ? replayOnView(root.current, tl) : undefined;
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [ready] }
  );

  return (
    <div ref={root} className="relative">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none" strokeLinecap="square">
        {ready &&
          paths.map((d, i) => {
            const on = i === hovered;
            const p = pulseDash(d, 0.2);
            return (
              <g key={i}>
                <path data-reach-arm="" d={d} stroke={on ? LOGO_BLUES.light : "#2b3566"} strokeWidth="4" style={{ transition: "stroke 250ms ease" }} />
                <path
                  data-reach-pulse=""
                  d={d}
                  className="pulse"
                  stroke={on ? "var(--color-accent)" : LOGO_BLUES.light}
                  strokeWidth="4"
                  strokeDasharray={p.strokeDasharray}
                  style={{ ...p.style, animationDuration: on ? "1.1s" : "2.6s", animationDelay: `${i * -0.7}s`, opacity: on ? 1 : 0.6 }}
                />
              </g>
            );
          })}
      </svg>

      {/* Logo ve adı yan yana (header'daki kilitle aynı: mavi yazı + altında küçük satır).
          Kollar yalnız işaretten çıkar; ölçüm `logo` ref'inden. */}
      <div className="flex items-center gap-[clamp(1rem,2vw,1.5rem)]">
        <div ref={logo} className="w-fit shrink-0">
          <LogoMark className="h-[clamp(6.5rem,5rem+3vw,8.5rem)] w-auto" strokeWidth={30} gradientId="logo-reach" />
        </div>
        <div data-reach-brand="" className="flex flex-col items-start gap-2">
          <Image
            src="/brand/wordmark.png"
            alt={brand.name}
            width={679}
            height={175}
            sizes="160px"
            style={{ height: "clamp(1.9rem, 1.5rem + 1vw, 2.5rem)", width: "auto" }}
          />
          <span className="text-[0.75rem] font-semibold uppercase leading-none tracking-[0.16em] text-periwinkle">{brand.sub}</span>
        </div>
      </div>

      <dl className="relative mt-10 grid gap-8 pl-[clamp(6rem,4.5rem+3vw,8rem)] text-body">
        {rows.map((row, i) => (
          <div
            key={row.label}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
          >
            <dt className="flex items-center gap-2 text-small text-muted">
              <span
                data-reach-dot=""
                ref={(el) => {
                  dots.current[i] = el;
                }}
                className={`grid size-8 shrink-0 place-items-center border-2 transition-colors duration-200 ${
                  i === hovered ? "border-accent text-accent" : "border-[#2b3566] text-periwinkle"
                }`}
              >
                <Icon name={row.icon} className="size-4" />
              </span>
              {row.label}
            </dt>
            <dd className="mt-2 text-ink">
              {row.href ? (
                <a href={row.href} className="link">
                  {row.lines.join(" ")}
                </a>
              ) : (
                row.lines.map((line, j) => (
                  <span key={j} className="block">
                    {line}
                  </span>
                ))
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
