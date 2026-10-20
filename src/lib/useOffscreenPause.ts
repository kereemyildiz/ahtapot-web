"use client";

import { useEffect, type RefObject } from "react";

/**
 * Eleman ekran dışındayken `data-offscreen` taşır; globals.css bu durumda
 * içindeki tüm CSS animasyonlarını duraklatır. Sonsuz döngüdeki çizim
 * animasyonları (darbeler, model salınımı) görünmezken işlemci harcamasın.
 */
export function useOffscreenPause(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-offscreen", !e.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
