"use client";

import { useEffect, useRef, useState } from "react";
import { pulseDash } from "@/lib/svgPath";

export type FieldLabels = {
  center: string;
  devices: string[];
  online: string;
  installing: string;
  installed: string;
  training: string;
  trained: string;
  calibrating: string;
  calibrated: string;
  updating: string;
  updated: string;
};

/**
 * Saha katmanının sahnesi: izometrik bir sağlık kuruluşunda üç farklı
 * tıbbi cihaz servis merkezine bağlı; hatlarda telemetri akar. 12 sn'lik
 * döngüde sırayla kurulum, eğitim, kalibrasyon ve yazılım güncellemesi
 * oynar; her cihazın durum kartı ve alttaki zaman çizelgesi buna göre
 * değişir. Temsili: kurulu bir cihaz parkını göstermez.
 */

type P = [number, number];
const VB_W = 600;
const VB_H = 520;
const O: P = [300, 265];
const K = 1.25;
const iso = (x: number, y: number, z: number): P => [O[0] + (x - y) * 0.866 * K, O[1] + ((x + y) * 0.5 - z) * K];
const pts = (list: P[]) => list.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");

/** İzometrik kutu: üst ve iki görünen yan yüz. */
function IsoBox({ x0, x1, y0, y1, z0, z1, accent = false }: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; accent?: boolean }) {
  const top = [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)];
  const left = [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)];
  const right = [iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)];
  const stroke = accent ? "var(--color-accent)" : "var(--color-periwinkle)";
  return (
    <g stroke={stroke} strokeWidth="1.5" strokeLinejoin="round">
      <polygon points={pts(left)} fill="#141a33" />
      <polygon points={pts(right)} fill="#10152b" />
      <polygon points={pts(top)} fill="#1b2140" />
    </g>
  );
}

// Cihazlar: 0 laboratuvar cihazı (sol arka), 1 görüntüleme istasyonu (sağ),
// 2 klinik cihaz (ön). Bağlantı noktaları cihazların üstünde.
const ANCHORS: P[] = [iso(-100, -55, 48), iso(50, -62, 98), iso(90, 60, 128)];
const NODE: P = [60, 46];
// Hatlar servis merkezinden ayrı yüksekliklerde çıkar, cihazların arasından iner.
const LINK_Y = [68, 100, 84];
const LINKS = ANCHORS.map((a, i) => `M${NODE[0]} ${NODE[1] + 16} V${LINK_Y[i]} H${a[0].toFixed(1)} V${(a[1] - 9).toFixed(1)}`);
const LINK_PULSES = LINKS.map((d) => pulseDash(d, 0.08));
const CARDS: P[] = [
  [20, 236],
  [446, 12],
  [404, 372],
];

const PERIOD = 12;

export function FieldService({ labels, steps, active }: { labels: FieldLabels; steps: string[]; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [t, setT] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = active && inView;

  useEffect(() => {
    if (!running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now() - t * 1000;
    const id = window.setInterval(() => setT(((performance.now() - start) / 1000) % PERIOD), 100);
    return () => window.clearInterval(id);
    // t yalnız kaldığı yerden sürsün diye başlangıçta okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const phase = Math.floor(t / 3);
  const p = (t % 3) / 3;
  // Her aşamada çalışan cihaz ve durum metinleri.
  const working = [0, 2, 1, 0][phase];
  const status = (i: number): { text: string; progress: number | null } => {
    if (i !== working) {
      const done = [labels.installed, labels.trained, labels.calibrated, labels.updated];
      // Bu döngüde kendi işi bittiyse onu, yoksa çevrimiçi göster.
      const own = [0, 2, 1].indexOf(i);
      if (own >= 0 && own < phase) return { text: done[own === 0 && phase > 3 ? 3 : own], progress: null };
      return { text: labels.online, progress: null };
    }
    const doing = [labels.installing, labels.training, labels.calibrating, labels.updating][phase];
    const done = [labels.installed, labels.trained, labels.calibrated, labels.updated][phase];
    return p < 0.82 ? { text: doing, progress: p / 0.82 } : { text: done, progress: 1 };
  };

  return (
    <div ref={host} className="absolute inset-0 bg-[#0b0e1a]" aria-hidden="true">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="field-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="rgb(147 164 244 / 0.05)" />
          </pattern>
        </defs>
        <rect width={VB_W} height={VB_H} fill="url(#field-grid)" />

        {/* Zemin */}
        <polygon
          data-draw=""
          points={pts([iso(-160, -100, 0), iso(160, -100, 0), iso(160, 100, 0), iso(-160, 100, 0)])}
          fill="rgb(147 164 244 / 0.04)"
          stroke="rgb(147 164 244 / 0.35)"
          strokeWidth="1.5"
        />

        {/* Servis merkezinden cihazlara hatlar ve telemetri */}
        <g fill="none" strokeLinejoin="round">
          {LINKS.map((d, i) => (
            <path key={d} data-draw="" d={d} stroke={i === working ? "var(--color-accent)" : "rgb(147 164 244 / 0.45)"} strokeWidth="1.8" />
          ))}
          {LINKS.map((d, i) => (
            <path
              key={`p${d}`}
              d={d}
              strokeDasharray={LINK_PULSES[i].strokeDasharray}
              stroke="var(--color-ink)"
              strokeWidth="3.5"
              className="pulse"
              style={{ ...LINK_PULSES[i].style, animationDuration: i === working ? "1.1s" : "2.6s" }}
            />
          ))}
        </g>
        <g transform={`translate(${NODE[0]} ${NODE[1]})`}>
          <path d="M0 -16 L16 0 L0 16 L-16 0 Z" fill="#1b2140" stroke="var(--color-periwinkle)" strokeWidth="2" />
          <path d="M-5 0 H5 M0 -5 V5" stroke="var(--color-accent)" strokeWidth="2" opacity="0" />
          <text x="24" y="5" fontSize="13" fontFamily="var(--font-sans)" fill="var(--color-ink)">
            {labels.center}
          </text>
        </g>

        {/* 1: laboratuvar cihazı (eğik ön panelli gövde) */}
        <IsoBox x0={-135} x1={-65} y0={-80} y1={-30} z0={0} z1={30} accent={working === 0} />
        <polygon
          points={pts([iso(-135, -30, 30), iso(-65, -30, 30), iso(-65, -55, 48), iso(-135, -55, 48)])}
          fill="#1b2140"
          stroke={working === 0 ? "var(--color-accent)" : "var(--color-periwinkle)"}
          strokeWidth="1.5"
        />
        <polygon points={pts([iso(-125, -34, 33), iso(-85, -34, 33), iso(-85, -48, 43), iso(-125, -48, 43)])} fill="rgb(215 248 154 / 0.25)" />

        {/* 2: görüntüleme istasyonu (masa, monitör, tarayıcı) */}
        <IsoBox x0={20} x1={110} y0={-80} y1={-40} z0={0} z1={40} accent={working === 1} />
        <IsoBox x0={80} x1={104} y0={-76} y1={-50} z0={40} z1={58} accent={working === 1} />
        <polygon
          points={pts([iso(30, -62, 48), iso(70, -62, 48), iso(70, -62, 98), iso(30, -62, 98)])}
          fill="#10152b"
          stroke={working === 1 ? "var(--color-accent)" : "var(--color-periwinkle)"}
          strokeWidth="1.5"
        />
        <polygon points={pts([iso(34, -62, 54), iso(66, -62, 54), iso(66, -62, 92), iso(34, -62, 92)])} fill="rgb(147 164 244 / 0.3)" />

        {/* 3: klinik cihaz (tekerlekli ayak, direk, ekran) */}
        <IsoBox x0={70} x1={110} y0={40} y1={80} z0={0} z1={6} accent={working === 2} />
        <path d={`M${iso(90, 60, 6).join(" ")} L${iso(90, 60, 92).join(" ")}`} stroke="var(--color-periwinkle)" strokeWidth="3" />
        <IsoBox x0={72} x1={108} y0={54} y1={66} z0={92} z1={128} accent={working === 2} />
        <path
          d={`M${iso(74, 66, 100).join(" ")} L${iso(84, 66, 100).join(" ")} L${iso(88, 66, 112).join(" ")} L${iso(92, 66, 96).join(" ")} L${iso(96, 66, 104).join(" ")} L${iso(106, 66, 104).join(" ")}`}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          className="pulse"
          style={{ animationDuration: "1.4s" }}
        />

        {/* Durum ışıkları */}
        {ANCHORS.map((a, i) => (
          <rect key={i} x={a[0] - 4} y={a[1] - 4} width="8" height="8" fill={i === working ? "var(--color-ink)" : "var(--color-accent)"} className={i === working ? "field-blink" : ""} />
        ))}

        {/* Durum kartları */}
        {CARDS.map(([x, y], i) => {
          const s = status(i);
          const on = i === working;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect width="148" height={s.progress !== null ? 58 : 48} fill="rgb(10 12 22 / 0.92)" stroke={on ? "var(--color-accent)" : "rgb(147 164 244 / 0.3)"} />
              <text x="12" y="19" fontSize="11" fontFamily="var(--font-sans)" fill="var(--color-muted)">
                {labels.devices[i]}
              </text>
              <text x="12" y="37" fontSize="13" fontWeight="600" fontFamily="var(--font-sans)" fill={on ? "var(--color-accent)" : "var(--color-ink)"}>
                {s.text}
              </text>
              {s.progress !== null && (
                <g transform="translate(12 46)">
                  <rect width="124" height="4" fill="#1b2038" />
                  <rect width={124 * s.progress} height="4" fill="var(--color-accent)" />
                </g>
              )}
            </g>
          );
        })}

        {/* Zaman çizelgesi */}
        <g transform={`translate(40 ${VB_H - 26})`} fontFamily="var(--font-sans)" fontSize="13">
          <path d="M0 0 H420" stroke="rgb(147 164 244 / 0.3)" strokeWidth="2" />
          <path d={`M0 0 H${(420 * (t / PERIOD)).toFixed(1)}`} stroke="var(--color-accent)" strokeWidth="2" />
          {steps.slice(0, 4).map((label, i) => (
            <g key={label} transform={`translate(${i * 140} 0)`}>
              <rect x="-6" y="-6" width="12" height="12" fill={i === phase ? "var(--color-accent)" : "var(--color-ground)"} stroke="var(--color-accent)" strokeWidth="2" />
              <text x="12" y="-10" fill={i === phase ? "var(--color-ink)" : "var(--color-muted)"}>
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
