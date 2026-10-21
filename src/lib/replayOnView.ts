/**
 * Giriş çizimini bölüme her girişte yeniden oynatır (aşağıdan da yukarıdan da).
 * - Eleman görünümün orta bandına (üst/alt %20 hariç) girince ve çizim başa
 *   sarılmışsa oynar.
 * - Eleman tamamen ekran dışına çıkınca başa sarılır; geri gelince boş
 *   kareden başlar, görünürken yarıda kesilmez.
 * ScrollTrigger yerine IntersectionObserver: ScrollTrigger'ın yeniden ölçümü
 * (refresh) "çıktı" geri çağrısını tetikleyip çizimi başa sarılı bırakıyordu
 * (mobilde stetoskop ve iletişim logosu hiç görünmüyordu).
 */
export function replayOnView(el: Element, tl: gsap.core.Timeline) {
  const band = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && tl.progress() === 0) tl.play(0);
    },
    { rootMargin: "-20% 0px -20% 0px" }
  );
  const offscreen = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) tl.pause(0);
  });
  band.observe(el);
  offscreen.observe(el);
  return () => {
    band.disconnect();
    offscreen.disconnect();
  };
}
