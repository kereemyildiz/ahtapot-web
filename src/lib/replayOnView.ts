/**
 * Giriş çizimini eleman görünüme girince oynatır.
 * - Eleman görünümün orta bandına (üst/alt %20 hariç) girince ve çizim başa
 *   sarılmışsa oynar.
 * - Varsayılan: bölüme her girişte yeniden oynar (aşağıdan da yukarıdan da).
 *   Eleman tamamen ekran dışına çıkınca başa sarılır; geri gelince boş
 *   kareden başlar, görünürken yarıda kesilmez.
 * - `once: true`: sayfa başına bir kez oynar; bittikten sonra son karesinde
 *   durağan kalır, bölümden çıkıp girince yeniden oynamaz.
 * ScrollTrigger yerine IntersectionObserver: ScrollTrigger'ın yeniden ölçümü
 * (refresh) "çıktı" geri çağrısını tetikleyip çizimi başa sarılı bırakıyordu
 * (mobilde stetoskop ve iletişim logosu hiç görünmüyordu).
 */
export function replayOnView(el: Element, tl: gsap.core.Timeline, { once = false }: { once?: boolean } = {}) {
  const band = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting || tl.progress() !== 0) return;
      tl.play(0);
      if (once) band.disconnect();
    },
    { rootMargin: "-20% 0px -20% 0px" }
  );
  band.observe(el);
  if (once) return () => band.disconnect();

  const offscreen = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) tl.pause(0);
  });
  offscreen.observe(el);
  return () => {
    band.disconnect();
    offscreen.disconnect();
  };
}
