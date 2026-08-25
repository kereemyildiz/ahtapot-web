"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import { buildRailPath, type RailMarker } from "@/components/meander/kinkPath";
import { useLenisContext } from "@/components/providers/LenisContext";

export type RailMarkerInput = { id: string; label: string };

type SiteRailProps = {
  layerMarkers: RailMarkerInput[]; // MEKANİK..SAHA — artık nav durağı değil
  sectionMarkers: RailMarkerInput[]; // KATMANLAR, ÜRÜNLER..İLETİŞİM — gerçek nav
};

const VIEWBOX_HEIGHT = 900;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;

/**
 * Rail'in nav'ı gerçek sayfa bölümleridir (KATMANLAR, ÜRÜNLER, HAKKIMIZDA,
 * EKİP, KARİYER, İLETİŞİM) — eşit aralıklı, eşit ağırlıkta 6 durak.
 *
 * MEKANİK/ELEKTRONİK/GÖMÜLÜ/UYGULAMA/SAHA artık kendi başlarına nav durağı
 * DEĞİL — bunlar KATMANLAR durağının kendi içinde meander'ın kıvrıldığı
 * anlar. Kalıcı, tıklanabilir bir liste olarak durmuyorlar; yalnızca o
 * bölümü scroll'larken tek bir canlı "şu an buradayız" göstergesi olarak
 * beliriyor, kink'in yanına oturuyor, sonra kayboluyor. Önceki sürümde
 * hepsi ÜRÜNLER/HAKKIMIZDA gibi gerçek sayfa bölümleriyle aynı görsel
 * ağırlıkta, kalıcı bir liste halindeydi — bu "neden mekanik bir ana
 * başlık" eleştirisinin sebebiydi.
 */
export function SiteRail({ layerMarkers, sectionMarkers }: SiteRailProps) {
  const { scrollToId } = useLenisContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const drawnPathRef = useRef<SVGPathElement>(null);
  const mobileFillRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const currentLayerRef = useRef<HTMLDivElement>(null);

  const primaryStep =
    sectionMarkers.length > 1
      ? (VIEWBOX_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) /
        (sectionMarkers.length - 1)
      : 0;

  const tickPositioned = sectionMarkers.map((m, i) => ({
    ...m,
    kind: "tick" as const,
    y: MARGIN_TOP + i * primaryStep,
  }));

  // Kink'ler yalnız KATMANLAR (ilk tick) ile bir sonraki tick arasındaki
  // aralığa gömülü — kendi nav satırları yok, yalnız path geometrisi +
  // canlı gösterge için Y konumu.
  const katmanlarY = tickPositioned[0]?.y ?? MARGIN_TOP;
  const nextTickY = tickPositioned[1]?.y ?? VIEWBOX_HEIGHT - MARGIN_BOTTOM;
  const kinkGap = (nextTickY - katmanlarY) / (layerMarkers.length + 1);
  const kinkPositioned = layerMarkers.map((m, i) => ({
    ...m,
    kind: "kink" as const,
    y: katmanlarY + (i + 1) * kinkGap,
  }));

  const railMarkers: RailMarker[] = [...tickPositioned, ...kinkPositioned].map(
    (m) => ({ type: m.kind, y: m.y })
  );
  const d = buildRailPath(VIEWBOX_HEIGHT, railMarkers);

  useGSAP(
    () => {
      if (!drawnPathRef.current) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          full: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          if (reduced) {
            gsap.set(drawnPathRef.current, { drawSVG: "100%" });
            if (mobileFillRef.current) {
              gsap.set(mobileFillRef.current, { scaleX: 1 });
            }
          } else {
            gsap.set(drawnPathRef.current, { drawSVG: "0%" });
            if (mobileFillRef.current) {
              gsap.set(mobileFillRef.current, { scaleX: 0 });
            }

            const scrubTl = gsap.timeline({
              scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.3,
              },
            });
            scrubTl.to(
              drawnPathRef.current,
              { drawSVG: "100%", ease: "none" },
              0
            );
            if (mobileFillRef.current) {
              scrubTl.to(
                mobileFillRef.current,
                { scaleX: 1, ease: "none" },
                0
              );
            }
          }

          // Gerçek nav (tick) aktif durumu — gerçek section sınırlarından.
          tickPositioned.forEach((marker) => {
            const sectionEl = document.getElementById(marker.id);
            const labelEl = labelRefs.current[marker.id];
            if (!sectionEl || !labelEl) return;
            ScrollTrigger.create({
              trigger: sectionEl,
              start: "top center",
              end: "bottom center",
              toggleClass: { targets: labelEl, className: "is-active" },
            });
          });

          // Katman göstergesi — kalıcı liste değil, tek bir canlı etiket.
          // Her katman section'ına girince (ileri ya da geri) metni/konumu
          // günceller; ilk katmanın öncesine ya da sonuncunun sonrasına
          // çıkınca kaybolur.
          const currentLayerEl = currentLayerRef.current;
          if (currentLayerEl) {
            kinkPositioned.forEach((marker, i) => {
              const sectionEl = document.getElementById(marker.id);
              if (!sectionEl) return;

              const show = () => {
                currentLayerEl.textContent = marker.label;
                currentLayerEl.style.top = `${(marker.y / VIEWBOX_HEIGHT) * 100}%`;
                currentLayerEl.classList.add("is-visible");
              };

              ScrollTrigger.create({
                trigger: sectionEl,
                start: "top center",
                end: "bottom center",
                onEnter: show,
                onEnterBack: show,
                onLeave: () => {
                  if (i === kinkPositioned.length - 1) {
                    currentLayerEl.classList.remove("is-visible");
                  }
                },
                onLeaveBack: () => {
                  if (i === 0) {
                    currentLayerEl.classList.remove("is-visible");
                  }
                },
              });
            });
          }
        }
      );

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef}>
      <div className="sticky top-0 hidden h-screen w-28 shrink-0 flex-col border-r border-steel/20 md:flex">
        {/* Logonun kendi elması + meander bacakları — kod-türetilmiş
            çizginin "kaynağı". Gerçek logo varlığı (bkz. public/logo.jpg,
            arka planı silinmiş hali public/logo-mark.png). */}
        <div className="flex shrink-0 flex-col items-center gap-1.5 py-6">
          <Image
            src="/logo-mark.png"
            alt="Ahtapot"
            width={112}
            height={144}
            priority
            className="h-9 w-auto"
          />
          <span className="font-display text-[11px] font-semibold tracking-[0.02em] text-foreground">
            AHTAPOT
          </span>
        </div>
        <div className="relative w-full flex-1">
          <svg
            viewBox={`-4 0 70 ${VIEWBOX_HEIGHT}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Henüz çizilmemiş kısım — logonun kendi gradient yönü (üst
                açık, alt koyu) burada "gelecek" anlamına geliyor. Bu path'te
                de vector-effect yok — altındaki DrawSVG path'iyle aynı
                (orantısız) ölçeklenmeli ki ikisi birebir üst üste otursun. */}
            <path
              d={d}
              fill="none"
              stroke="var(--color-periwinkle)"
              strokeWidth={2}
            />
            {/* Çizilmiş kısım — scroll ile DrawSVG üzerinden açılır.
                vector-effect burada YOK: DrawSVGPlugin/getTotalLength,
                preserveAspectRatio="none" (orantısız ölçek) + non-scaling-
                stroke kombinasyonunda path uzunluğunu ölçemiyor ("path
                length cannot be measured" uyarısı, animasyonu kilitliyor). */}
            <path
              ref={drawnPathRef}
              d={d}
              fill="none"
              stroke="var(--color-ahtapot)"
              strokeWidth={2}
            />
          </svg>

          {/* Katman göstergesi — KATMANLAR bölümünü scroll'larken beliren
              tek, hareketli etiket. Nav değil, salt "şu an buradayız". */}
          <div
            ref={currentLayerRef}
            className="rail-current-layer absolute left-14 -translate-y-1/2 whitespace-nowrap font-mono-data text-[11px] uppercase tracking-[0.06em] text-eosin"
            aria-hidden="true"
          />

          <nav aria-label="Bölüm gezinme">
            <ul className="absolute inset-0">
              {tickPositioned.map((marker) => (
                <li
                  key={marker.id}
                  className="absolute left-14 -translate-y-1/2"
                  style={{ top: `${(marker.y / VIEWBOX_HEIGHT) * 100}%` }}
                >
                  <button
                    type="button"
                    onClick={() => scrollToId(marker.id)}
                    ref={(el) => {
                      labelRefs.current[marker.id] = el;
                    }}
                    className="rail-label whitespace-nowrap font-mono-data text-[11px] uppercase tracking-[0.06em]"
                  >
                    <span className="rail-dot" aria-hidden="true" />
                    {marker.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobil: rail ince bir üst ilerleme çubuğuna iner, kink/tick ayrımı
          yok. */}
      <div
        className="fixed inset-x-0 top-0 z-40 h-1 bg-steel/20 md:hidden"
        aria-hidden="true"
      >
        <div
          ref={mobileFillRef}
          className="h-full w-full origin-left bg-ahtapot"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
