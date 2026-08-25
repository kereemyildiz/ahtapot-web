"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import type { Product } from "@/content/schema";

// Kareler 4:3 üretildi (bkz. public/products/su-banyosu/turntable) —
// TODO(mock-data): su banyosunun gerçek fotoğrafları yerine kod-üretimli
// soyut kareler kullanılıyor, bkz. docs/mock-data-todo.md.
const CANVAS_W = 900;
const CANVAS_H = 675;

/**
 * ScrollTrigger scrub ile dönen kare sekansı. Kareler önce tamamen preload
 * edilir (canvas'a çizim, <img src> değişimi değil — reflow/decode
 * gecikmesi olmasın). Mobilde 36 → 12 kareye düşer (adım atlayarak, ayrı
 * dosya seti değil). Reduced motion'da tek statik kare kalır, scrub kurulmaz.
 */
export function Turntable({ product }: { product: Product }) {
  const turntable = product.assets.turntable;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [ready, setReady] = useState(false);

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

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
          desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduced, mobile } = context.conditions as {
            reduced: boolean;
            mobile: boolean;
          };

          if (reduced) {
            // Tek statik kare — çekici bir açı, dönüş yok.
            drawFrame(Math.floor(turntable.frameCount * 0.15));
            return;
          }

          // Mobilde 36 → 12: ayrı dosya seti değil, aynı setten adım atlama.
          const step = mobile ? 3 : 1;
          const indices: number[] = [];
          for (let i = 0; i < turntable.frameCount; i += step) {
            indices.push(i);
          }
          drawFrame(indices[0]);

          const state = { progress: 0 };
          gsap.to(state, {
            progress: 1,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.3,
            },
            onUpdate: () => {
              const i = Math.min(
                indices.length - 1,
                Math.floor(state.progress * indices.length)
              );
              drawFrame(indices[i]);
            },
          });
        }
      );

      return () => mm.revert();
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
    <div ref={containerRef} className="aspect-[4/3] overflow-hidden bg-slide">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="h-full w-full"
        role="img"
        aria-label={`${product.slug} ürününün 360° dönen görseli`}
      />
    </div>
  );
}
