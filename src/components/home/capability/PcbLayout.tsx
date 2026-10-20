"use client";

import { useEffect, useRef, useState } from "react";
import { pulseDash } from "@/lib/svgPath";

export type PcbLabels = {
  layers: string;
  layerNames: string[];
  nets: string[];
  net: string;
  drc: string;
  drcRunning: string;
  board: string;
};

/**
 * Elektronik katmanın sahnesi: bir kart tasarım aracı. İki bakır katman,
 * bileşen ayak izleri, 45° kırılan izler, vialar, alt katmanda toprak
 * dolgusu ve uzunluğu eşlenmiş bir diferansiyel çift. Netler sırayla
 * vurgulanır, üzerlerinden sinyal geçer; kural denetimi kartı tarar.
 * İzler sahne etkin olunca kendini çizer (yönlendirme). Temsili bir kart.
 */

type Net = { paths: string[]; bottom?: boolean; wide?: boolean };

// Ağ adları içerikteki sırayla: SPI_SCK, SPI_MOSI, SENS_IN, HEATER_PWM, USB_D±, 3V3.
const NETS: Net[] = [
  { paths: ["M258 172 H228 L190 134 V115 H173"] },
  { paths: ["M258 180 H220 L182 142 V124 H173"] },
  { paths: ["M110 290 V200 L127 183 V133"], bottom: true },
  { paths: ["M316 242 V266 L358 308 H420"] },
  {
    paths: [
      "M510 236 H468 L436 204 H414 V196 H406 V204 H398 V196 H390 V204 H342",
      "M510 244 H468 L436 212 H342",
    ],
  },
  { paths: ["M452 122 V140 L420 172 H342", "M300 158 V140 L280 120 H190 V106 H173"], wide: true },
];

// Vurgulanmayan, alt katmandaki diğer izler (toprak ve dönüşler).
const BACKGROUND_TRACES = [
  "M150 160 V220 L180 250 H220",
  "M380 140 H400 L420 160 V214",
  "M300 242 V300 L270 330 H160",
  "M342 228 H372 L392 248 V282",
  "M480 300 V340 H340",
];
const VIAS: [number, number][] = [
  [110, 290],
  [127, 133],
  [150, 160],
  [220, 250],
  [380, 140],
  [420, 214],
  [300, 300],
  [160, 330],
  [392, 282],
  [480, 300],
  [340, 340],
];

const QFP_OFF = [-28, -20, -12, -4, 4, 12, 20, 28];

function Pads() {
  return (
    <g fill="var(--color-periwinkle)">
      {/* U1: 32 bacaklı QFP */}
      {QFP_OFF.map((o) => (
        <g key={o}>
          <rect x={253} y={200 + o - 2} width={10} height={4} />
          <rect x={337} y={200 + o - 2} width={10} height={4} />
          <rect x={300 + o - 2} y={153} width={4} height={10} />
          <rect x={300 + o - 2} y={237} width={4} height={10} />
        </g>
      ))}
      {/* U2: SOIC-8 */}
      {[106, 115, 124, 133].map((y) => (
        <g key={y}>
          <rect x={121} y={y - 2.5} width={12} height={5} />
          <rect x={167} y={y - 2.5} width={12} height={5} />
        </g>
      ))}
      {/* U3: SOT-223 regülatör */}
      {[440, 452, 464].map((x) => (
        <rect key={x} x={x - 3} y={116} width={6} height={12} />
      ))}
      <rect x={438} y={80} width={28} height={12} />
      {/* J1: 2×5 konnektör (1. bacak kare) */}
      {[0, 1, 2, 3, 4].map((i) =>
        [0, 1].map((j) =>
          i === 0 && j === 0 ? (
            <rect key={`${i}${j}`} x={104 + j * 20} y={284 + i * 20 - 40} width={12} height={12} />
          ) : (
            <circle key={`${i}${j}`} cx={110 + j * 20} cy={290 + i * 20 - 40} r={6} />
          )
        )
      )}
      {/* J2: USB */}
      {[228, 236, 244, 252].map((y) => (
        <rect key={y} x={506} y={y - 2} width={14} height={4} />
      ))}
      <rect x={516} y={210} width={14} height={10} />
      <rect x={516} y={260} width={14} height={10} />
      {/* Y1 kristal, Q1 MOSFET, pasifler */}
      <rect x={214} y={245} width={10} height={10} />
      <rect x={236} y={245} width={10} height={10} />
      {[
        [420, 308],
        [440, 308],
        [430, 290],
      ].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x - 4} y={y - 4} width={8} height={8} />
      ))}
      {PASSIVES.map(([x, y, v]) =>
        v ? (
          <g key={`${x}${y}`}>
            <rect x={x - 3.5} y={y - 9} width={7} height={6} />
            <rect x={x - 3.5} y={y + 3} width={7} height={6} />
          </g>
        ) : (
          <g key={`${x}${y}`}>
            <rect x={x - 9} y={y - 3.5} width={6} height={7} />
            <rect x={x + 3} y={y - 3.5} width={6} height={7} />
          </g>
        )
      )}
    </g>
  );
}

// 0603 pasifler: x, y, dikey mi.
const PASSIVES: [number, number, boolean][] = [
  [205, 192, false],
  [205, 212, false],
  [372, 116, true],
  [392, 116, true],
  [236, 276, false],
  [470, 160, false],
  [470, 176, false],
  [160, 168, true],
  [400, 330, false],
  [452, 330, false],
];

const SILK: [string, number, number][] = [
  ["U1", 300, 204],
  ["U2", 150, 124],
  ["U3", 452, 104],
  ["J1", 92, 238],
  ["J2", 498, 206],
  ["Y1", 230, 270],
  ["Q1", 452, 296],
  ["R1", 205, 182],
  ["C1", 236, 292],
  ["C2", 382, 100],
];

const PULSES = NETS.map((n) => n.paths.map((d) => ({ d, ...pulseDash(d, 0.12) })));

export function PcbLayout({ labels, active }: { labels: PcbLabels; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [net, setNet] = useState(0);
  // Kural denetimi her turun başında yeniden çalışır, sonra temiz biter.
  const drcDone = net !== 0;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = active && inView;

  // Netleri sırayla vurgula; her tam turda kural denetimi tamamlanır.
  useEffect(() => {
    if (!running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setNet((n) => (n + 1) % NETS.length), 2400);
    return () => window.clearInterval(id);
  }, [running]);

  const swatches = ["var(--color-periwinkle)", "var(--color-brand)", "rgb(238 240 246 / 0.55)", "var(--color-muted)"];

  return (
    <div ref={host} className="absolute inset-0 flex flex-col bg-[#0b0e1a] text-[clamp(0.62rem,0.5rem+0.25vw,0.78rem)]">
      <div className="flex min-h-0 flex-1">
        {/* Katman paneli */}
        <aside className="hidden w-[25%] shrink-0 border-r border-periwinkle/15 p-3 sm:block" aria-hidden="true">
          <p className="mb-2 text-muted">{labels.layers}</p>
          <ul className="grid gap-1.5">
            {labels.layerNames.map((name, i) => (
              <li key={name} className="flex items-center gap-2 text-ink/85">
                <span className="size-2.5 shrink-0" style={{ background: swatches[i] }} />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-5 text-muted">{labels.net}</p>
          <ul className="grid gap-1">
            {labels.nets.map((n, i) => (
              <li key={n} className={`truncate px-1.5 py-0.5 font-mono ${i === net ? "bg-accent text-accent-ink" : "text-muted"}`}>
                {n}
              </li>
            ))}
          </ul>
        </aside>

        <div className="relative min-w-0 flex-1">
          <svg viewBox="20 20 540 390" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="pcb-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M0 0V8" stroke="var(--color-brand)" strokeWidth="2" />
              </pattern>
              <clipPath id="pcb-board">
                <path d="M40 40 H520 L540 60 V370 L520 390 H40 Z" />
              </clipPath>
            </defs>

            {/* Kart, toprak dolgusu (alt katman), kenar */}
            <path d="M40 40 H520 L540 60 V370 L520 390 H40 Z" fill="#0f1530" />
            <rect x="40" y="40" width="500" height="350" fill="url(#pcb-hatch)" opacity="0.12" clipPath="url(#pcb-board)" />
            <path d="M40 40 H520 L540 60 V370 L520 390 H40 Z" fill="none" stroke="var(--color-muted)" strokeWidth="2" />
            {[
              [58, 58],
              [502, 58],
              [58, 372],
              [502, 372],
            ].map(([x, y]) => (
              <g key={`${x}${y}`} fill="none" stroke="var(--color-periwinkle)">
                <circle cx={x} cy={y} r="9" strokeWidth="3" />
                <circle cx={x} cy={y} r="4" strokeWidth="1" opacity="0.6" />
              </g>
            ))}

            {/* Alt katman izleri */}
            <g fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" opacity="0.85">
              {BACKGROUND_TRACES.map((d) => (
                <path key={d} data-draw="" d={d} />
              ))}
            </g>

            {/* Serigrafi: gövde çerçeveleri ve etiketler */}
            <g fill="none" stroke="rgb(238 240 246 / 0.4)" strokeWidth="1">
              <path d="M266 167 H334 V233 H266 Z M272 167 L266 173" />
              <path d="M138 100 H162 V140 H138 Z" />
              <path d="M432 76 H472 V130 H432 Z" />
              <path d="M96 236 H144 V338 H96 Z" />
              <path d="M210 240 H250 V260 H210 Z" />
            </g>
            <g fontSize="9" fontFamily="var(--font-mono)" fill="rgb(238 240 246 / 0.55)">
              {SILK.map(([t, x, y]) => (
                <text key={t} x={x} y={y} textAnchor="middle">
                  {t}
                </text>
              ))}
            </g>

            <Pads />

            {/* Üst/alt katman netleri; etkin net fosfor yeşili */}
            {NETS.map((n, i) => (
              <g
                key={i}
                fill="none"
                stroke={i === net ? "var(--color-accent)" : n.bottom ? "var(--color-brand)" : "var(--color-periwinkle)"}
                strokeWidth={n.wide ? 4.5 : i === net ? 3 : 2.5}
                strokeLinejoin="round"
                opacity={i === net ? 1 : 0.8}
                style={{ transition: "stroke 300ms ease, opacity 300ms ease" }}
              >
                {n.paths.map((d) => (
                  <path key={d} data-draw="" d={d} />
                ))}
              </g>
            ))}
            {/* Etkin netten geçen sinyal */}
            <g fill="none" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinecap="round">
              {PULSES[net].map((p) => (
                <path key={p.d} d={p.d} strokeDasharray={p.strokeDasharray} className="pulse" style={{ ...p.style, animationDuration: "1.2s" }} />
              ))}
            </g>

            {/* Vialar */}
            {VIAS.map(([x, y]) => (
              <g key={`${x}${y}`}>
                <circle cx={x} cy={y} r="5" fill="var(--color-periwinkle)" />
                <circle cx={x} cy={y} r="2" fill="#0b0e1a" />
              </g>
            ))}

            {/* Kural denetimi taraması */}
            <rect className="pcb-drc" x="40" y="40" width="3" height="350" fill="var(--color-accent)" opacity="0.6" />
          </svg>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-periwinkle/15 bg-ground/60 px-3 py-1.5 font-mono text-muted" aria-hidden="true">
        <span className="truncate">
          {labels.net}: <span className="text-accent">{labels.nets[net]}</span>
        </span>
        <span className="hidden truncate sm:inline">{labels.board}</span>
        <span className={drcDone ? "text-ink" : ""}>{drcDone ? labels.drc : labels.drcRunning}</span>
      </div>
    </div>
  );
}
