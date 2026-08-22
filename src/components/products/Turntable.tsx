"use client";

import type { Product } from "@/content/schema";

/**
 * ScrollTrigger scrub ile dönen görsel sekansı — fiziksel cihaz için
 * (spec §"interaction" tablosu). TODO (görsel bölüm işi): gerçek kare
 * sekansı ve scrub animasyonu; bu round yalnız `interaction: "turntable"`
 * seçildiğinde bu bileşenin devreye girdiğini kanıtlıyor.
 */
export function Turntable({ product }: { product: Product }) {
  const turntable = product.assets.turntable;

  if (!turntable) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-eosin/50 p-4 text-center font-mono-data text-xs uppercase tracking-[0.06em] text-eosin">
        TODO: turntable kare seti eksik ({product.slug})
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center border border-ahtapot/40 font-mono-data text-xs uppercase tracking-[0.06em] text-ahtapot">
      Turntable — {turntable.frameCount} kare
    </div>
  );
}
