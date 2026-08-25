"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@/lib/gsapSetup";
import type { Product } from "@/content/schema";

// Kareler 4:3 üretildi (bkz. public/products/su-banyosu/turntable) —
// TODO(mock-data): su banyosunun gerçek fotoğrafları yerine kod-üretimli
// soyut kareler kullanılıyor, bkz. docs/mock-data-todo.md.
const CANVAS_W = 900;
const CANVAS_H = 675;

/**
 * Artık sayfa scroll'una bağlı DEĞİL — sürükle ya da üzerindeyken tekerlek
 * çevir, ürün döner; sayfa kendi kaydırmasını hiç kaybetmiyor (önceki
 * ScrollTrigger scrub sürümü, sayfanın scroll'uyla karışıyordu, "görsele
 * odaklanınca hiçbir şey olmuyor" şikayetinin sebebiydi — artık üzerine
 * gelip tekerlek çevirmek TAM OLARAK bir şey yapıyor, sayfa kaymıyor).
 * Kareler preload edilir, reduced motion'da tek statik kare kalır.
 */
export function Turntable({ product }: { product: Product }) {
  const turntable = product.assets.turntable;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const indexRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (!turntable) return;
    let cancelled = false;
    const total = turntable.frameCount;
    const images: HTMLImageElement[] = new Array(total);
    let loadedCount = 0;

    for (let i = 0; i < total; i++) {
      const img = new window.Image();
      img.src = `${turntable.framesPath}${String(i + 1).padStart(2, "0")}.jpg`;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === total && !cancelled) setReady(true);
      };
      images[i] = img;
    }
    imagesRef.current = images;

    return () => {
      cancelled = true;
    };
  }, [turntable]);

  useGSAP(
    () => {
      if (!turntable || !ready) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const drawFrame = (index: number) => {
        const img = imagesRef.current[index];
        if (img?.complete) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };

      const total = turntable.frameCount;
      // Çekici bir başlangıç açısı (tam cepheden değil).
      indexRef.current = Math.floor(total * 0.15);
      drawFrame(indexRef.current);

      if (reducedMotion) return; // statik kare, sürükleme/tekerlek yok.

      canvas.style.cursor = "grab";
      canvas.style.touchAction = "pan-y"; // dikey scroll'u mobilde bloklama

      const setIndex = (next: number) => {
        indexRef.current = ((next % total) + total) % total;
        drawFrame(indexRef.current);
      };

      let dragging = false;
      let lastX = 0;
      const DRAG_PX_PER_FRAME = 6;

      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        if (Math.abs(dx) >= DRAG_PX_PER_FRAME) {
          const steps = Math.trunc(dx / DRAG_PX_PER_FRAME);
          setIndex(indexRef.current - steps);
          lastX += steps * DRAG_PX_PER_FRAME;
        }
      };
      const endDrag = () => {
        dragging = false;
        canvas.style.cursor = "grab";
      };
      // Sayfa üzerindeyken tekerlek çevirince SAYFA kaymaz, ürün döner.
      // preventDefault TEK BAŞINA yetmiyor — Lenis wheel'i window'da ayrıca
      // dinliyor ve kendi scroll'unu sürüyor, defaultPrevented'e bakmıyor.
      // stopPropagation olayın Lenis'e hiç ulaşmamasını sağlıyor.
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex(indexRef.current + (e.deltaY > 0 ? 1 : -1));
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointerleave", endDrag);
      canvas.addEventListener("pointercancel", endDrag);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", endDrag);
        canvas.removeEventListener("pointerleave", endDrag);
        canvas.removeEventListener("pointercancel", endDrag);
        canvas.removeEventListener("wheel", onWheel);
      };
    },
    { scope: containerRef, dependencies: [ready] }
  );

  if (!turntable) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-eosin/50 p-4 text-center font-mono-data text-xs uppercase tracking-[0.06em] text-eosin">
        TODO: turntable kare seti eksik ({product.slug})
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative aspect-[4/3] overflow-hidden bg-slide">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="h-full w-full"
        role="img"
        aria-label={`${product.slug} ürününün 360° dönen görseli — sürükle ya da tekerlek çevir`}
      />
      {!reducedMotion && (
        <p className="pointer-events-none absolute bottom-3 left-3 font-mono-data text-[11px] uppercase tracking-[0.06em] text-steel">
          sürükle / tekerlek çevir
        </p>
      )}
    </div>
  );
}
