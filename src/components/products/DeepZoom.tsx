"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsapSetup";
import type { Product } from "@/content/schema";
import type OpenSeadragonType from "openseadragon";

// TODO(mock-data): gerçek bir SVS'ten (openslide ile) türetilmiş DZI —
// bkz. docs/mock-data-todo.md. Bu, ürünün kendi vakası değil, örnek bir
// slayt kırpıntısı; uydurma piksel verisi değil, gerçek doku.
const ANNOTATION_D = "M32,22 L58,17 L66,36 L50,52 L30,45 Z";

// Bu bileşen yalnız client'ta render ediliyor (ProductInteractionView'de
// next/dynamic ssr:false) — ilk render'da bile window var.
function computeAutoActivate(): boolean {
  if (typeof window === "undefined") return false;
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  return isDesktop && !prefersReduced;
}

/**
 * OpenSeadragon'un KENDİ mouse/touch gesture sistemi açık (mouseNavEnabled)
 * — üzerindeyken tekerlek çevirmek/pinch yapmak SADECE görüntüyü
 * yakınlaştırır, sayfa kaymaz (tıpkı bir harita gibi — standart, bilinen
 * davranış). Önceki sürüm sayfa scroll'unu GSAP scrub ile sürüyordu; bu
 * hem "görsele odaklanınca hiçbir şey olmuyor" şikayetinin hem de
 * scroll çakışmasının kök sebebiydi. Artık scroll'a hiç bağımlı değil.
 */
export function DeepZoom({ product }: { product: Product }) {
  const dz = product.assets.deepzoom;
  const containerRef = useRef<HTMLDivElement>(null);
  const osdElRef = useRef<HTMLDivElement>(null);
  const annotationRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const viewerRef = useRef<OpenSeadragonType.Viewer | null>(null);

  const [activated, setActivated] = useState(computeAutoActivate);

  useEffect(() => {
    if (!dz || !activated || !osdElRef.current) return;
    let cancelled = false;
    let viewer: OpenSeadragonType.Viewer | undefined;

    import("openseadragon").then(({ default: OpenSeadragon }) => {
      if (cancelled || !osdElRef.current) return;

      viewer = OpenSeadragon({
        element: osdElRef.current,
        tileSources: dz.dziPath,
        showNavigator: false,
        // OSD'nin varsayılan +/- buton ikonları kendi asset klasöründen
        // geliyor (prefixUrl kurmadık) — ikonlar yüklenmiyordu, kırık
        // görsel + alt metin ("Zoom in" vb.) üst üste biniyordu. Zaten
        // tekerlek/pinch/sürükle native çalışıyor, butona gerek yok.
        showNavigationControl: false,
        mouseNavEnabled: true,
        gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true },
        animationTime: 0.4,
      });
      viewerRef.current = viewer;

      viewer.addHandler("open", () => {
        if (cancelled || !viewer) return;
        const viewport = viewer.viewport;

        const updateLabel = () => {
          if (!labelRef.current) return;
          const imageZoom = viewport.viewportToImageZoom(viewport.getZoom(true));
          const magnification = dz.nativeObjective * imageZoom;
          const mpp = dz.nativeMpp / imageZoom;
          labelRef.current.textContent = `${magnification.toFixed(0)}× · ${mpp.toFixed(2)} µm/px`;
        };

        updateLabel();
        viewer!.addHandler("viewport-change", updateLabel);

        // Annotasyon bir kez, açılışta yumuşakça beliriyor — artık
        // scroll'a değil, "görüntü hazır" anına bağlı.
        if (annotationRef.current) {
          gsap.set(annotationRef.current, { drawSVG: "0%" });
          gsap.to(annotationRef.current, {
            drawSVG: "100%",
            duration: 0.8,
            delay: 0.6,
            ease: "power2.out",
          });
        }
      });
    });

    return () => {
      cancelled = true;
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [dz, activated]);

  if (!dz) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-eosin/50 p-4 text-center font-mono-data text-xs uppercase tracking-[0.06em] text-eosin">
        TODO: deepzoom görüntü kaynağı eksik ({product.slug})
      </div>
    );
  }

  // Blok tema ne olursa olsun koyu zeminde durur (CLAUDE.md) — gerçek
  // patoloji viewer'ları koyu arayüzlü, doku öyle okunur.
  return (
    <div
      ref={containerRef}
      data-theme="dark"
      className="relative aspect-[4/3] overflow-hidden bg-ink"
    >
      {!activated ? (
        <div className="relative h-full w-full">
          <Image
            src="/deepzoom/poster.jpg"
            alt="Dijital patoloji görüntüleyicisinden örnek doku kırpıntısı"
            fill
            className="object-cover opacity-70"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {/* Mono ama UPPERCASE değil: µm gibi bilimsel birimler
                text-transform:uppercase altında "MM"e dönüşüyor (µ'nün
                büyük harfi farklı bir karakter) — yanlış birim okunur. */}
            <p className="font-mono-data text-xs tracking-[0.06em] text-periwinkle">
              {dz.nativeObjective.toFixed(0)}× · {dz.nativeMpp.toFixed(2)} µm/px
            </p>
            <button
              type="button"
              onClick={() => setActivated(true)}
              className="border border-slide px-4 py-2 font-body text-sm font-semibold text-slide transition-colors hover:bg-slide hover:text-ink"
            >
              Demoyu aç
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={osdElRef}
            className="h-full w-full"
            role="img"
            aria-label={`${product.slug} — whole-slide görüntüde tekerlek/pinch ile 2×–40× arası yakınlaştırma`}
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 75"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              ref={annotationRef}
              d={ANNOTATION_D}
              fill="none"
              stroke="var(--color-eosin)"
              strokeWidth={0.6}
            />
          </svg>
          <p
            ref={labelRef}
            className="pointer-events-none absolute bottom-3 left-3 font-mono-data text-xs tracking-[0.06em] text-periwinkle"
          />
        </>
      )}
    </div>
  );
}
