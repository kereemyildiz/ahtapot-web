"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import { LOGO_BLUES, LOGO_PATHS } from "@/components/brand/LogoMark";
import type { ProductLayer } from "@/content/constants";
import { drawDash, pulseDash } from "@/lib/svgPath";
import { useOffscreenPause } from "@/lib/useOffscreenPause";

/**
 * Hero görseli: logodaki ahtapot işareti ve dört kolu. Kollar logonun kendi
 * meander çizgisinin devamı; her biri bir disipline (mekanik, elektronik,
 * gömülü yazılım, uygulama) uzanır. Kollarda sinyal akar, modüller sırayla
 * yanar: tek beyin, dört kol, tek ekip.
 */

type Node = {
  layer: ProductLayer;
  name: string;
  detail: string;
};

// Logo koordinatlarını (viewBox 140..720) bu sahneye taşıyan dönüşüm.
const LOGO_T = { x: 128, y: 22, s: 0.4 };
const L = (x: number, y: number) => [x * LOGO_T.s + LOGO_T.x, y * LOGO_T.s + LOGO_T.y] as const;

const [olx, oly] = L(170, 640); // sol dış kanca köşesi
const [orx, ory] = L(690, 640); // sağ dış kanca köşesi
const [ilx, ily] = L(200, 845); // sol iç bacak köşesi
const [irx, iry] = L(660, 845); // sağ iç bacak köşesi

const MODULES: Record<ProductLayer, { cx: number; cy: number; arm: string }> = {
  mekanik: { cx: 100, cy: 486, arm: `M${olx} ${oly} H100 V446` },
  elektronik: { cx: 500, cy: 486, arm: `M${orx} ${ory} H500 V446` },
  gomulu: { cx: 200, cy: 656, arm: `M${ilx} ${ily} V616` },
  uygulama: { cx: 400, cy: 656, arm: `M${irx} ${iry} V616` },
};

// Modüllerdeki mini çizimler, yetkinlikler bölümündeki büyük çizimlerin
// küçükleri: aynı dil, etkin modülde çalışır halde.
const plate = (y: number) => `M0 ${y - 10} L24 ${y} L0 ${y + 10} L-24 ${y} Z`;

const CHIP_TRACES = ["M11 -5 H30 V-20 H44", "M11 5 H34 V22 H44", "M-11 5 H-28 V24 H-44", "M-11 -5 H-44"];

// Basamak yanıtı (ζ = 0.5): ayar değerini biraz aşıp oturan kontrol eğrisi.
const SCOPE_CURVE = (() => {
  const zeta = 0.5;
  const wd = Math.sqrt(1 - zeta * zeta);
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 11;
    const y = 1 - Math.exp(-zeta * t) * (Math.cos(wd * t) + (zeta / wd) * Math.sin(wd * t));
    pts.push(`${i ? "L" : "M"}${(-44 + (i / 40) * 90).toFixed(1)} ${(26 - y * 36).toFixed(1)}`);
  }
  return pts.join(" ");
})();
const SCOPE_PULSE = pulseDash(SCOPE_CURVE, 0.04);
const MARK = "M-8 -4 L8 -8 L18 2 L12 14 L-4 14 L-12 6 Z";
const MARK_DRAW = drawDash(MARK);

function ModuleArt({ layer }: { layer: ProductLayer }) {
  switch (layer) {
    case "mekanik":
      // Açılmış görünüş: kapak, kart, gövde; etkin olunca açılıp kapanır.
      return (
        <g>
          <g className="mod-explode-top">
            <path d={plate(-15)} />
          </g>
          <path d={plate(0)} strokeDasharray="4 4" strokeWidth="2" />
          <g className="mod-explode-bottom">
            <path d={`${plate(15)} M-24 15 V20 L0 30 L24 20 V15 M0 25 V30`} />
          </g>
          <path d="M-38 -15 V15 M-41 -15 H-35 M-41 15 H-35" strokeWidth="2" />
        </g>
      );
    case "elektronik":
      return (
        <g>
          <g opacity="0.6" strokeWidth="2">
            {CHIP_TRACES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g className="mod-live" stroke="var(--color-ink)" strokeWidth="3.5">
            {CHIP_TRACES.map((d, i) => {
              const p = pulseDash(d, 0.1);
              return (
                <path
                  key={d}
                  d={d}
                  strokeDasharray={p.strokeDasharray}
                  className="pulse"
                  style={{ ...p.style, animationDuration: "1.6s", animationDelay: `${i * -0.4}s` }}
                />
              );
            })}
          </g>
          <rect x="-11" y="-11" width="22" height="22" />
          <path d="M-5 -11 V-16 M5 -11 V-16 M-5 11 V16 M5 11 V16" strokeWidth="2" />
        </g>
      );
    case "gomulu":
      // Mini osiloskop: ayar çizgisi ve kontrol yanıtı, ucunda ışın.
      return (
        <g>
          <path d="M-44 -28 V26 H46" strokeWidth="2" opacity="0.6" />
          <path d="M-44 -10 H46" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.8" />
          <path d={SCOPE_CURVE} />
          <path
            d={SCOPE_CURVE}
            className="mod-live pulse"
            strokeDasharray={SCOPE_PULSE.strokeDasharray}
            stroke="var(--color-ink)"
            strokeWidth="6"
            style={{ ...SCOPE_PULSE.style, animationDuration: "2.4s" }}
          />
        </g>
      );
    case "uygulama":
      // Uygulama penceresi, doku kesiti ve üstünde çizilen işaretleme.
      return (
        <g>
          <rect x="-46" y="-30" width="92" height="60" />
          <path d="M-46 -19 H46" strokeWidth="2" />
          <path d="M-34 14 L-24 -6 L-4 -12 L18 -6 L36 6 L28 20 L-2 22 L-26 22 Z" strokeWidth="1.5" opacity="0.55" />
          <path d={MARK} stroke="var(--color-eosin)" strokeDasharray={MARK_DRAW.strokeDasharray} style={MARK_DRAW.style} className="mod-draw" />
        </g>
      );
  }
}

export function HeroNetwork({ label, nodes }: { label: string; nodes: Node[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [cycling, setCycling] = useState(false);
  const current = hovered ?? active;
  useOffscreenPause(root);

  const replay = useRef<(() => void) | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ delay: 0.2, onComplete: () => setCycling(true) });
        tl.from("[data-logo-path]", { drawSVG: "0%", duration: 0.9, stagger: 0.14, ease: "power2.inOut" })
          .from("[data-arm]", { drawSVG: "0%", duration: 0.8, stagger: 0.1, ease: "power2.inOut" }, "-=0.3")
          .from("[data-module]", { autoAlpha: 0, scale: 0.85, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.08, ease: "expo.out" }, "-=0.4")
          .from("[data-node-label]", { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.06 }, "-=0.3");

        // Giriş yalnız ilk açılışta değil: hero'ya geri dönülünce ve logonun
        // başına gelinince yeniden çizilir (oynarken baştan başlatılmaz).
        replay.current = () => {
          if (!tl.isActive()) tl.restart(true);
        };
        ScrollTrigger.create({ trigger: root.current, start: "top bottom", end: "bottom top", onEnterBack: () => replay.current?.() });
        return () => {
          replay.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  // Modüller sırayla yanar; imleç bir modülün üstündeyken döngü durur.
  useEffect(() => {
    if (!cycling || hovered !== null) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % nodes.length), 2400);
    return () => window.clearInterval(id);
  }, [cycling, hovered, nodes.length]);

  // İmleç ışığı: React'i yeniden çizdirmeden CSS değişkeni olarak taşınır.
  // Değişkenler yalnız ışık katmanına yazılır; köke yazılsa her harekette
  // bütün SVG'nin stili yeniden hesaplanırdı.
  const spot = useRef<HTMLDivElement>(null);
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = spot.current;
    if (e.pointerType !== "mouse" || !el) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el.style.setProperty("--spot", "1");
  };

  return (
    <div
      ref={root}
      className="absolute inset-0 flex items-center justify-center overflow-hidden p-[4%]"
      onPointerMove={onPointerMove}
      onPointerLeave={() => spot.current?.style.setProperty("--spot", "0")}
    >
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="hero-pattern pointer-events-none absolute inset-0" />
      <div ref={spot} aria-hidden="true" className="hero-spot pointer-events-none absolute inset-0" />
      <svg viewBox="0 0 600 760" className="relative h-full w-full max-w-[40rem]" role="img" aria-label={label}>
        <defs>
          <linearGradient id="hero-logo" gradientUnits="userSpaceOnUse" x1="150" y1="130" x2="710" y2="865">
            <stop offset="0" stopColor={LOGO_BLUES.deep} />
            <stop offset="0.42" stopColor={LOGO_BLUES.mid} />
            <stop offset="0.62" stopColor={LOGO_BLUES.light} />
            <stop offset="1" stopColor={LOGO_BLUES.deep} />
          </linearGradient>
        </defs>

        {/* Kollar: sabit iz + üstünde akan sinyal. */}
        {nodes.map((n, i) => {
          const m = MODULES[n.layer];
          const on = i === current;
          const armPulse = pulseDash(m.arm, 0.08);
          return (
            <g key={`arm-${n.layer}`}>
              <path data-arm="" d={m.arm} fill="none" stroke={on ? LOGO_BLUES.light : "#2b3566"} strokeWidth="6" strokeLinecap="square" style={{ transition: "stroke 400ms ease" }} />
              <path
                d={m.arm}
                fill="none"
                stroke={on ? "var(--color-accent)" : LOGO_BLUES.light}
                strokeWidth={on ? 6 : 4}
                strokeDasharray={armPulse.strokeDasharray}
                className="pulse"
                style={{ ...armPulse.style, animationDuration: on ? "1.4s" : "2.8s", animationDelay: `${i * -0.6}s`, opacity: on ? 1 : 0.55 }}
              />
            </g>
          );
        })}

        {/* Logo işareti */}
        <g
          transform={`translate(${LOGO_T.x} ${LOGO_T.y}) scale(${LOGO_T.s})`}
          fill="none"
          stroke="url(#hero-logo)"
          strokeWidth="40"
          strokeLinecap="square"
          onPointerEnter={() => replay.current?.()}
        >
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} data-logo-path="" />
          ))}
        </g>

        {/* Modüller */}
        {nodes.map((n, i) => {
          const m = MODULES[n.layer];
          const on = i === current;
          return (
            <g
              key={n.layer}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              <g data-module="" transform={`translate(${m.cx} ${m.cy})`}>
                <rect x="-70" y="-42" width="140" height="84" fill={on ? "#1d2445" : "#151a33"} style={{ transition: "fill 400ms ease" }} />
                <g
                  className={on ? "mod-on" : undefined}
                  fill="none"
                  stroke={on ? "var(--color-accent)" : LOGO_BLUES.light}
                  strokeWidth="3"
                  strokeLinejoin="miter"
                  style={{ transition: "stroke 400ms ease" }}
                >
                  <ModuleArt layer={n.layer} />
                </g>
              </g>
              <g data-node-label="" transform={`translate(${m.cx} ${m.cy + 66})`} textAnchor="middle">
                <text fontFamily="var(--font-display)" fontWeight="500" fontSize="17" fill={on ? "var(--color-ink)" : "var(--color-muted)"} style={{ transition: "fill 300ms ease" }}>
                  {n.name}
                </text>
                <text y="22" fontFamily="var(--font-sans)" fontSize="13.5" fill="var(--color-muted)">
                  {n.detail}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
