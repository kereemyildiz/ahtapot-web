"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsapSetup";
import { buildRailPath, type RailMarker } from "@/components/meander/kinkPath";
import { useLenisContext } from "@/components/providers/LenisContext";

export type RailMarkerInput = { id: string; label: string };

type SiteRailProps = {
  layerMarkers: RailMarkerInput[]; // KATMANLAR — 5 kink
  sectionMarkers: RailMarkerInput[]; // ÜRÜNLER..İLETİŞİM — tick (referanslar veri yoksa listeye girmez)
};

const VIEWBOX_HEIGHT = 900;

/**
 * Sayfayı baştan sona kat eden tek meander path — sol rail'de kalıcı, hem
 * nav hem ilerleme göstergesi. Bkz. docs/superpowers/specs/2026-08-22-
 * ahtapot-web-design.md §1-2.
 *
 * Marker Y konumları (viewBox içinde) gerçek section yüksekliklerine göre
 * ölçeklenmiyor — bilinçli: rail, sayfanın *sıkıştırılmış sembolik* bir
 * temsili (sabit yükseklikli sticky kolon), section'ların gerçek piksel
 * oranı değil. Aktif durum ise gerçek section sınırlarından (ScrollTrigger)
 * geliyor — o yüzden vurgulanan etiket her zaman doğru, konumu her zaman
 * aynı yerde.
 *
 * 10 marker (5 kink + 5 tick) tek bir sürekli dizi olarak eşit aralıklı —
 * eskiden iki ayrı kümeydi (kink'ler üstte sıkışık, aralarında büyük boş
 * alan, tick'ler dipte sıkışık), kompozisyon olarak kötüydü. Ayrıca kink ve
 * tick artık metin ağırlığında da ayrışıyor: kink etiketi (katman — asıl
 * anlatı) her zaman tam görünür, tick etiketi (sayfa bölümü — nav) sessiz
 * durur, hover/aktifte belirginleşir. Onluk düz bir liste gibi görünmesin
 * diye.
 */
export function SiteRail({ layerMarkers, sectionMarkers }: SiteRailProps) {
  const { scrollToId } = useLenisContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const drawnPathRef = useRef<SVGPathElement>(null);
  const mobileFillRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const totalMarkers = layerMarkers.length + sectionMarkers.length;
  const marginTop = 50;
  const marginBottom = 50;
  const step =
    totalMarkers > 1
      ? (VIEWBOX_HEIGHT - marginTop - marginBottom) / (totalMarkers - 1)
      : 0;

  const positioned = [
    ...layerMarkers.map((m, i) => ({
      ...m,
      kind: "kink" as const,
      y: marginTop + i * step,
    })),
    ...sectionMarkers.map((m, i) => ({
      ...m,
      kind: "tick" as const,
      y: marginTop + (layerMarkers.length + i) * step,
    })),
  ];

  const railMarkers: RailMarker[] = positioned.map((m) => ({
    type: m.kind,
    y: m.y,
  }));
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
            // Çizgi tek seferde çizili görünür — scrub yok.
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

          // Aktif katman/bölüm vurgusu — gerçek section sınırlarından.
          // Bu bir "hareket" değil, bir konum göstergesi; reduced motion'da
          // da çalışır.
          positioned.forEach((marker) => {
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
          <nav aria-label="Bölüm gezinme">
            <ul className="absolute inset-0">
              {positioned.map((marker) => (
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
                    className={`rail-label whitespace-nowrap font-mono-data uppercase tracking-[0.06em] ${
                      marker.kind === "kink"
                        ? "text-[11px]"
                        : "rail-label--tick text-[10px]"
                    }`}
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
