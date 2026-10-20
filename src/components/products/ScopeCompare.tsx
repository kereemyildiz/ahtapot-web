"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import type { MediaImage } from "@/content/schema";

export type CompareCopy = {
  heading: string;
  caption: string;
  microscopeLabel: string;
  digitalLabel: string;
  microscopeAlt: string;
  digitalAlt: string;
  handle: string;
};

const SCALE_UM = 200;
const MIN = 3;
const MAX = 97;

/**
 * Aynı doku kesiti iki biçimde: solda mikroskop okülerinden görüldüğü gibi
 * (dairesel, dar alan, sıcak ışık; temsili), sağda dijital slayt (tüm
 * kesit, işaretleme, gerçek ölçek). Ayraç kaydırdıkça kendiliğinden sola
 * çekilir; fare üzerine gelince imleci izler, dokunmatikte tutup
 * sürüklenir, klavyede ok tuşlarıyla kayar. Kullanıcı bir kez dokununca
 * kaydırmaya bağlı hareket bırakılır. Sayfa kaydırması hiç kesilmez.
 */
export function ScopeCompare({ image, copy }: { image: MediaImage; copy: CompareCopy }) {
  const root = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const manual = useRef(false);
  const dragging = useRef(false);
  const scrub = useRef<gsap.core.Tween | null>(null);
  const target = useRef(50);
  const current = useRef(50);
  const raf = useRef(0);
  const barUnits = image.umPerPx ? SCALE_UM / image.umPerPx : 0;

  const apply = useCallback((v: number) => {
    current.current = v;
    root.current?.style.setProperty("--split", v.toFixed(2));
    handle.current?.setAttribute("aria-valuenow", String(Math.round(v)));
  }, []);

  // Fareyi yumuşak izle: hedefe her karede biraz yaklaş (döngü ref'te).
  const step = useRef<() => void>(() => {});
  useEffect(() => {
    step.current = () => {
      const d = target.current - current.current;
      if (Math.abs(d) < 0.05) {
        apply(target.current);
        raf.current = 0;
        return;
      }
      apply(current.current + d * 0.25);
      raf.current = requestAnimationFrame(() => step.current());
    };
  }, [apply]);

  const moveTo = useCallback(
    (v: number, immediate = false) => {
      // Kullanıcı devraldı: kaydırmaya bağlı perde bırakılır.
      if (!manual.current) {
        manual.current = true;
        scrub.current?.scrollTrigger?.kill();
        scrub.current?.kill();
      }
      target.current = Math.min(MAX, Math.max(MIN, v));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (immediate || reduce) {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        apply(target.current);
      } else if (!raf.current) {
        raf.current = requestAnimationFrame(() => step.current());
      }
    },
    [apply]
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        scrub.current = gsap.fromTo(
          root.current,
          { "--split": 88 },
          {
            "--split": 14,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top 85%", end: "bottom 35%", scrub: 0.5 },
            onUpdate: () => {
              const v = Number(getComputedStyle(root.current!).getPropertyValue("--split"));
              if (Number.isNaN(v)) return;
              current.current = target.current = v;
              handle.current?.setAttribute("aria-valuenow", String(Math.round(v)));
            },
          }
        );
        gsap.from("[data-compare-ann]", {
          drawSVG: "0%",
          duration: 1.2,
          ease: "power2.inOut",
          scrollTrigger: { trigger: root.current, start: "center 60%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  const pct = (clientX: number) => {
    const r = root.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || dragging.current) moveTo(pct(e.clientX));
  };
  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandleUp = () => {
    dragging.current = false;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 4;
    const keys: Record<string, number> = {
      ArrowLeft: current.current - step,
      ArrowRight: current.current + step,
      Home: MIN,
      End: MAX,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    moveTo(keys[e.key], true);
  };

  return (
    <div
      ref={root}
      onPointerMove={onPointerMove}
      className="relative aspect-[4/3] cursor-ew-resize touch-pan-y overflow-hidden bg-black select-none"
      style={{ "--split": 50 } as CSSProperties}
    >
      {/* Mikroskop: büyütülmüş dar alan, dairesel görüş, halojen sıcaklığı. */}
      <div className="absolute inset-0">
        <Image
          src={image.src}
          alt={copy.microscopeAlt}
          fill
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="scale-[1.8] object-cover [filter:sepia(0.35)_saturate(1.1)_brightness(1.04)_blur(0.4px)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle closest-side at 50% 50%, transparent 80%, rgb(0 0 0 / 0.55) 90%, #000 96%)" }}
        />
        {/* Okülerdeki gösterge iğnesi. */}
        <div aria-hidden="true" className="absolute left-0 top-1/2 h-[3px] w-[48%] -translate-y-1/2 bg-black/85" />
      </div>

      {/* Dijital: tüm kesit, işaretleme ve gerçek ölçek çubuğu. */}
      <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 calc(var(--split) * 1%))" }}>
        <Image src={image.src} alt={copy.digitalAlt} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
        <svg viewBox={`0 0 ${image.width} ${image.height}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path
            data-compare-ann=""
            d="M520 250 L610 222 L688 282 L700 372 L640 448 L548 458 L496 390 L488 310 Z"
            fill="rgb(224 81 138 / 0.12)"
            stroke="var(--color-eosin)"
            strokeWidth="4"
          />
          {barUnits > 0 && (
            <g transform={`translate(${image.width - 40 - barUnits} ${image.height * 0.84})`}>
              <rect x="-14" y="-34" width={barUnits + 28} height="52" fill="rgb(10 12 22 / 0.8)" />
              <path d={`M0 -10 V0 H${barUnits} V-10`} fill="none" stroke="var(--color-ink)" strokeWidth="3" />
              <text x={barUnits / 2} y="-12" textAnchor="middle" fill="var(--color-ink)" fontSize="18" fontFamily="var(--font-sans)">
                {SCALE_UM} µm
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Ayraç: fosfor yeşili çizgi ve tutamak (klavyeyle de kayar). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent" style={{ left: "calc(var(--split) * 1%)" }} />
      <div
        ref={handle}
        role="slider"
        tabIndex={0}
        aria-label={copy.handle}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={50}
        onKeyDown={onKey}
        onPointerDown={onHandleDown}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center bg-accent text-accent-ink shadow-[0_8px_24px_rgb(0_0_0/0.45)] active:cursor-grabbing"
        style={{ left: "calc(var(--split) * 1%)" }}
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M6 4 2 8l4 4zM10 4l4 4-4 4z" />
        </svg>
      </div>

      {/* Etiketler karşı köşelerde: dar ekranda çakışmasın. */}
      <span className="pointer-events-none absolute bottom-3 left-3 bg-ground/85 px-3 py-2 text-small text-ink">{copy.microscopeLabel}</span>
      <span className="pointer-events-none absolute right-3 top-3 bg-ground/85 px-3 py-2 text-small text-ink">{copy.digitalLabel}</span>
    </div>
  );
}
