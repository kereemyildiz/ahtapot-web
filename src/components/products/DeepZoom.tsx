"use client";

import { useEffect, useRef } from "react";
import type OpenSeadragonType from "openseadragon";
import type { Product } from "@/content/schema";

/**
 * OpenSeadragon, scroll ile 2×→40× — görüntüleme yazılımı için (spec
 * §"interaction" tablosu). Yalnız bu bileşen mount olduğunda openseadragon
 * import ediliyor (dinamik import), ProductInteractionView zaten bunu
 * next/dynamic(ssr:false) ile lazy yüklüyor — bu ikinci kat, paketin
 * kendisini de yalnız gerçekten gerektiğinde çekiyor.
 *
 * TODO (görsel bölüm işi): gerçek DZI kaynağı; bu round yalnız
 * `interaction: "deepzoom"` seçildiğinde devreye girdiğini kanıtlıyor.
 */
export function DeepZoom({ product }: { product: Product }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dzi = product.assets.deepzoom;

  useEffect(() => {
    if (!dzi || !containerRef.current) return;

    let viewer: OpenSeadragonType.Viewer | undefined;
    let cancelled = false;

    import("openseadragon").then(({ default: OpenSeadragon }) => {
      if (cancelled || !containerRef.current) return;
      viewer = OpenSeadragon({
        element: containerRef.current,
        tileSources: dzi.dziPath,
        showNavigator: false,
      });
    });

    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [dzi]);

  if (!dzi) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-eosin/50 p-4 text-center font-mono-data text-xs uppercase tracking-[0.06em] text-eosin">
        TODO: deepzoom görüntü kaynağı eksik ({product.slug})
      </div>
    );
  }

  return (
    // Deepzoom bloğu tema ne olursa olsun koyu zeminde durur (CLAUDE.md) —
    // gerçek patoloji viewer'ları koyu arayüzlü, doku öyle okunur.
    <div ref={containerRef} data-theme="dark" className="aspect-[4/3] bg-ink" />
  );
}
