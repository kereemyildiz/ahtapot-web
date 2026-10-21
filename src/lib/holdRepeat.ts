import type { MouseEvent, PointerEvent } from "react";

/**
 * Kontrolcü tuşu gibi basılı tutunca hızlanan düğme (ENDA ET2011 kılavuzu:
 * ▲/▼ 0,5 sn basılı kalırsa değer hızla değişir, uzun basışta adım büyür).
 * İşaretçiyle basışta ilk adım hemen atılır; klavyede her Enter/Space bir adım.
 * Aynı anda tek tuş basılı olabileceği için zamanlayıcı modül düzeyinde.
 */
let timer = 0;
let started = 0;

function stop() {
  window.clearTimeout(timer);
  timer = 0;
}

export function holdRepeat(fire: (size: number) => void) {
  const tick = () => {
    fire(performance.now() - started > 2000 ? 1 : 0.1);
    timer = window.setTimeout(tick, 70);
  };
  return {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      stop();
      started = performance.now();
      fire(0.1);
      timer = window.setTimeout(tick, 500);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // İşaretçi basışı zaten adım attı; yalnız klavyeden gelen tıklama (detail 0) sayılır.
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      if (e.detail === 0) fire(0.1);
    },
    onContextMenu: (e: MouseEvent<HTMLButtonElement>) => e.preventDefault(),
  };
}
