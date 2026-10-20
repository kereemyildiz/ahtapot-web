"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import type { Product, ProductLayer } from "@/content/schema";
import { DEVICE_MODELS } from "@/components/device/registry";
import type { InteractionLabels } from "./ProductInteractionView";

type TurntableProps = {
  product: Product;
  labels: InteractionLabels;
  activeLayer?: ProductLayer | null;
};

/**
 * Fiziksel cihaz için tek etkileşim: sürükleyerek çevir. Boştayken yavaşça
 * kendi döner. Tekerlek olayına dokunmaz; sayfa kaydırması her zaman
 * kullanıcıda kalır.
 *
 * Kaynak: assets.turntable.framesPath varsa gerçek fotoğraf kareleri,
 * yoksa assets.turntable.model ile kayıtlı çizim modeli.
 */
export function Turntable({ product, labels, activeLayer }: TurntableProps) {
  const tt = product.assets.turntable;
  if (tt?.framesPath && tt.frameCount) {
    return <FrameTurntable framesPath={tt.framesPath} frameCount={tt.frameCount} labels={labels} />;
  }
  const Model = tt?.model ? DEVICE_MODELS[tt.model] : undefined;
  if (!Model) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-surface p-6 text-center text-small text-muted">
        TODO: {product.slug} için turntable kaynağı (kare seti ya da model) eksik.
      </div>
    );
  }
  return <ModelTurntable Model={Model} labels={labels} activeLayer={activeLayer} />;
}

function ModelTurntable({
  Model,
  labels,
  activeLayer,
}: {
  Model: (typeof DEVICE_MODELS)[string];
  labels: InteractionLabels;
  activeLayer?: ProductLayer | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const state = useRef({ ry: -30, dragging: false, lastX: 0, vel: 0 });

  useGSAP(
    () => {
      const el = model.current;
      const area = box.current;
      if (!el || !area) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(el, { "--ry": state.current.ry });

      const s = state.current;
      let visible = false;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(area);

      // Reduced motion: kendi kendine dönmez, ama sürükleyince döner
      // (kullanıcının başlattığı hareket).
      const tick = () => {
        if (reduce || !visible || s.dragging) return;
        s.vel *= 0.94;
        s.ry += 0.12 + s.vel;
        el.style.setProperty("--ry", String(s.ry));
      };
      gsap.ticker.add(tick);

      const down = (e: PointerEvent) => {
        s.dragging = true;
        s.lastX = e.clientX;
        s.vel = 0;
        area.setPointerCapture(e.pointerId);
        area.style.cursor = "grabbing";
      };
      const move = (e: PointerEvent) => {
        if (!s.dragging) return;
        const dx = e.clientX - s.lastX;
        s.lastX = e.clientX;
        s.ry += dx * 0.45;
        s.vel = dx * 0.12;
        el.style.setProperty("--ry", String(s.ry));
      };
      const up = () => {
        s.dragging = false;
        area.style.cursor = "grab";
      };
      area.addEventListener("pointerdown", down);
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerup", up);
      area.addEventListener("pointercancel", up);

      return () => {
        io.disconnect();
        gsap.ticker.remove(tick);
        area.removeEventListener("pointerdown", down);
        area.removeEventListener("pointermove", move);
        area.removeEventListener("pointerup", up);
        area.removeEventListener("pointercancel", up);
      };
    },
    { scope: box }
  );

  // Katman seçilince cihaz o katmanı gösterecek kadar açılır.
  useGSAP(
    () => {
      if (!model.current) return;
      gsap.to(model.current, {
        "--x": activeLayer ? 0.85 : 0,
        "--zoom": activeLayer ? 1.2 : 1.85,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.9,
        ease: "expo.inOut",
      });
    },
    { dependencies: [activeLayer], scope: box }
  );

  return (
    <div
      ref={box}
      className="relative aspect-[4/3] cursor-grab touch-pan-y bg-surface"
    >
      <Model ref={model} label={labels.modelAlt} active={activeLayer} style={{ "--x": 0, "--rx": -16, "--zoom": 1.85 } as CSSProperties} />
      <p className="pointer-events-none absolute bottom-4 left-4 text-small text-muted">{labels.dragHint}</p>
    </div>
  );
}

function FrameTurntable({
  framesPath,
  frameCount,
  labels,
}: {
  framesPath: string;
  frameCount: number;
  labels: InteractionLabels;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<HTMLImageElement[]>([]);
  const index = useRef(0);

  useEffect(() => {
    // Mobilde 36 yerine 12 kare.
    const step = window.matchMedia("(max-width: 767px)").matches ? 3 : 1;
    const list: HTMLImageElement[] = [];
    let loaded = 0;
    let cancelled = false;
    for (let i = 0; i < frameCount; i += step) {
      const img = new window.Image();
      img.src = `${framesPath}${String(i + 1).padStart(2, "0")}.jpg`;
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === list.length && !cancelled) setFrames(list);
      };
      list.push(img);
    }
    return () => {
      cancelled = true;
    };
  }, [framesPath, frameCount]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || frames.length === 0) return;
    const draw = () => ctx.drawImage(frames[index.current], 0, 0, c.width, c.height);
    draw();
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const steps = Math.trunc((e.clientX - lastX) / 8);
      if (!steps) return;
      lastX += steps * 8;
      index.current = (((index.current - steps) % frames.length) + frames.length) % frames.length;
      draw();
    };
    const up = () => (dragging = false);
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
    };
  }, [frames]);

  return (
    <div className="relative aspect-[4/3] bg-surface">
      <canvas ref={canvas} width={1200} height={900} className="h-full w-full cursor-grab touch-pan-y" role="img" aria-label={labels.modelAlt} />
      <p className="pointer-events-none absolute bottom-4 left-4 text-small text-muted">{labels.dragHint}</p>
    </div>
  );
}
