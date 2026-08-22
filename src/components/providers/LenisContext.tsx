"use client";

import { createContext, useContext, type RefObject } from "react";
import type Lenis from "lenis";

type LenisContextValue = {
  lenisRef: RefObject<Lenis | null>;
  /** Rail etiketine tıklayınca ilgili bölüme kaydırır. Lenis kuruluysa onu
   *  kullanır; reduced-motion'da (Lenis hiç kurulmadığında) native
   *  scrollIntoView'e düşer — instant/auto, "smooth" değil. */
  scrollToId: (id: string) => void;
};

export const LenisContext = createContext<LenisContextValue | null>(null);

export function useLenisContext(): LenisContextValue {
  const ctx = useContext(LenisContext);
  if (!ctx) {
    throw new Error("useLenisContext, SmoothScrollProvider içinde kullanılmalı");
  }
  return ctx;
}
