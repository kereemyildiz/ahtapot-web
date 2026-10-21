"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import type { LayerId } from "@/content/constants";
import { useOffscreenPause } from "@/lib/useOffscreenPause";
import { LayerVisual, type ToolLabels, type VisualItem } from "./visuals";

type StageItem = VisualItem & {
  layer: string;
  title: string;
  sentence: string;
};

// Adımlar arasındaki meander: logodaki gibi dik açılarla kıvrılan tek çizgi.
function threadPath(count: number, step: number) {
  const x0 = 10;
  let d = `M${x0} 0`;
  for (let i = 0; i < count - 1; i++) {
    const y = i * step;
    const k = step * 0.42;
    d += ` V${y + k} H${x0 + 22} V${y + k + 34} H${x0 + 10} V${y + k + 20} H${x0} V${y + step}`;
  }
  return d;
}

/**
 * Solda katmanlar akar, sağda sabit bir sahne: etkin katmanın çizimi
 * kendini çizer, fotoğrafı arkada belirir. Soldaki meander logodan türeyen
 * tek sürekli çizgi; kaydırdıkça uzar. Mobilde sahne her adımın içinde.
 */
export function CapabilityStage({ items, progressLabel, tools }: { items: StageItem[]; progressLabel: string; tools: ToolLabels }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useOffscreenPause(root);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
      // Her kurulumda sıfırlanır: StrictMode'un ikinci kurulumu (ya da yeniden
      // kurulum) gizli başlangıç durumunu yeniden uygular, çizimler de yeniden çizilmeli.
      const drawn = new Set<string>();

      const drawVisual = (scope: Element | null, key: string) => {
        if (!scope || reduce || drawn.has(key)) return;
        drawn.add(key);
        const q = gsap.utils.selector(scope);
        // Her çizimde her tür öğe yok; boş hedefe tween GSAP uyarısı basar.
        const play = (sel: string, from: gsap.TweenVars, to: gsap.TweenVars) => {
          const els = q(sel);
          if (els.length) gsap.fromTo(els, from, to);
        };
        // Araç ekranlarındaki [data-draw] yollar (kart izleri, saha hatları) çizilir.
        play("[data-draw]", { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.3, ease: "power2.inOut", stagger: 0.05 });
      };

      // Başlangıçta çizimler gizli (yalnız hareket açıkken).
      const toDraw = gsap.utils.toArray<SVGElement>("[data-draw]");
      if (!reduce && toDraw.length) gsap.set(toDraw, { drawSVG: "0%" });

      steps.forEach((step, i) => {
        const id = step.dataset.step as LayerId;
        ScrollTrigger.create({
          trigger: step,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (self) => {
            if (!self.isActive) return;
            setActive(i);
            drawVisual(root.current?.querySelector(`[data-stage-visual="${id}"]`) ?? null, `stage-${id}`);
          },
        });
        // Mobil: adımın kendi görseli ekrana girince çizilir.
        ScrollTrigger.create({
          trigger: step.querySelector("[data-inline-visual]"),
          start: "top 80%",
          once: true,
          onEnter: () => drawVisual(step.querySelector("[data-inline-visual]"), `inline-${id}`),
        });
      });

      if (!reduce) {
        gsap.from("[data-thread]", {
          drawSVG: "0%",
          ease: "none",
          scrollTrigger: { trigger: "[data-steps]", start: "top 60%", end: "bottom 60%", scrub: true },
        });

      }
    },
    { scope: root }
  );

  const STEP = 100;
  const threadHeight = (items.length - 1) * STEP;

  return (
    <div ref={root} className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div data-steps="" className="relative lg:col-span-5">
        {/* Masaüstü: adımların solunda logodan türeyen ilerleme çizgisi. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 lg:block" aria-hidden="true">
          <div className="sticky top-[calc(var(--header-h)+18vh)]">
            <svg width="40" height={threadHeight + 8} viewBox={`0 -4 40 ${threadHeight + 8}`} className="overflow-visible">
              <path d={threadPath(items.length, STEP)} fill="none" stroke="rgb(162 168 188 / 0.3)" strokeWidth="2.5" />
              <path data-thread="" d={threadPath(items.length, STEP)} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
              {items.map((it, i) => (
                <rect
                  key={it.id}
                  x={4}
                  y={i * STEP - 6}
                  width="12"
                  height="12"
                  fill={i <= active ? "var(--color-accent)" : "var(--color-ground)"}
                  stroke={i <= active ? "var(--color-accent)" : "rgb(162 168 188 / 0.6)"}
                  strokeWidth="2"
                  style={{ transition: "fill 250ms ease, stroke 250ms ease" }}
                />
              ))}
            </svg>
          </div>
        </div>

        <ol className="lg:pl-16" aria-label={progressLabel}>
          {items.map((it, i) => (
            <li
              key={it.id}
              data-step={it.id}
              className="flex flex-col justify-center py-10 lg:min-h-[78vh] lg:py-0"
            >
              <div className="relative mb-8 aspect-[4/5] lg:hidden" data-inline-visual="">
                <LayerVisual item={it} tools={tools} active />
              </div>
              <h3
                className={`font-display text-[clamp(1.7rem,1.1rem+1.8vw,2.8rem)] font-medium leading-[1.08] tracking-[-0.03em] transition-colors duration-300 ${
                  i === active ? "text-ink" : "text-ink/55"
                }`}
              >
                {it.title}
              </h3>
              <p className="mt-5 max-w-[42ch] text-body text-ink/90">{it.sentence}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {it.deliverables.map((d) => (
                  <li key={d} className="bg-surface-2 px-3 py-2 text-small text-ink">
                    {d}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      {/* Masaüstü: sabit sahne. */}
      <div className="hidden lg:col-span-7 lg:block">
        <div className="sticky top-[calc(var(--header-h)+5vh)] h-[calc(100svh-var(--header-h)-10vh)]">
          {items.map((it, i) => (
            <div
              key={it.id}
              data-stage-visual={it.id}
              aria-hidden={i !== active}
              // Asimetrik geçiş: giden çabuk söner, gelen biraz bekleyip açılır;
              // iki yoğun araç ekranı üst üste binmesin.
              className={`absolute inset-0 transition-[opacity,transform] ease-out-expo ${
                i === active ? "opacity-100 delay-[120ms] duration-[450ms] motion-reduce:delay-0" : "pointer-events-none scale-[0.985] opacity-0 duration-200"
              }`}
            >
              <LayerVisual item={it} tools={tools} active={i === active} eager={i === 0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
