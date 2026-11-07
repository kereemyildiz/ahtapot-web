"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * "Oyna, sonra dinlen": sahne etkinleşip görünür olunca hareket en çok `ms`
 * kadar sürer, sonra son karede durur (WCAG 2.2.2: kendiliğinden başlayan
 * hareket 5 sn'yi geçmez). Masaüstünde imleç sahnenin üstündeyken hareket
 * sürer (ya da yeniden başlar); imleç çıkınca, ilk süre de dolmuşsa durur.
 * Sahne yeniden etkinleşince (ya da yeniden görünür olunca) süre baştan sayılır.
 *
 * Dönen değerler:
 * - `running`: döngüler bu sırada çalışabilir (etkin + görünür + süre ya da hover).
 * - `hover`: imleç sahnede; bileşen "tek tur oyna, sonra bekle" durağını bunu
 *   görünce atlar (hover sürdükçe sonraki tura geçer).
 */
export function useMotionBudget(ref: RefObject<HTMLElement | null>, active: boolean, ms = 5000) {
  const [inView, setInView] = useState(false);
  const [expired, setExpired] = useState(false);
  const [hover, setHover] = useState(false);

  // Görünürlük: alanın en az dörtte biri ekranda olmalı; yoksa süre kenarda,
  // kimse bakmazken tükenir (mobilde satır içi görseller).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.25), {
      threshold: [0, 0.25],
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  // Yalnız fare: dokunmatikte "hover" dokunuşla gelip takılı kalır.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHover(true);
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHover(false);
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref]);

  const shown = active && inView;

  // Sahne her göründüğünde (ve gizlendiğinde) süre baştan sayılır. Render
  // sırasında düzeltilir (efektte setState zincirleme çizim yapar).
  const [prevShown, setPrevShown] = useState(shown);
  if (shown !== prevShown) {
    setPrevShown(shown);
    setExpired(false);
  }

  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setExpired(true), ms);
    return () => window.clearTimeout(id);
  }, [shown, ms]);

  return { running: shown && (!expired || hover), hover: shown && hover };
}
