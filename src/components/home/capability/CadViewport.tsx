"use client";

import { useEffect, useRef, useState } from "react";

export type CadLabels = { tree: string; parts: string[]; commands: string[]; units: string; view: string };

/**
 * Mekanik katmanın sahnesi: bir CAD çalışma alanı. Eğik ön panelli bir
 * cihaz gövdesinin tel kafes modeli gerçek 3B izdüşümle döner; görünmeyen
 * kenarlar CAD'deki gibi kesikli. Ölçü çizgileri modelle birlikte döner,
 * bir kesit düzlemi gövdeyi tarar, komut satırı komutları yazar ve model
 * ağacında ilgili parça yanar. Temsili bir gövde: belirli bir ürün değil.
 *
 * Kareler React'i yeniden çizdirmeden SVG yollarına yazılır; döngü yalnız
 * sahne etkin ve görünürken çalışır.
 */

type V3 = [number, number, number];

// Gövde profili (y: derinlik, z: yükseklik), x boyunca ±110 mm çekilir.
// Saat yönünün tersine; dışbükey (gizli kenar testi buna dayanır).
const PROFILE: [number, number][] = [
  [-80, 0],
  [80, 0],
  [80, 40],
  [50, 95],
  [-80, 95],
];
const HALF_W = 110;
const CENTER_Z = 47;

type Face = { n: V3 };
const SIDES: Face[] = PROFILE.map((p, i) => {
  const q = PROFILE[(i + 1) % PROFILE.length];
  const dy = q[0] - p[0];
  const dz = q[1] - p[1];
  const len = Math.hypot(dy, dz);
  return { n: [0, dz / len, -dy / len] };
});
const CAP_L: Face = { n: [-1, 0, 0] };
const CAP_R: Face = { n: [1, 0, 0] };

type Edge = { a: V3; b: V3; faces: Face[] };
const EDGES: Edge[] = [];
PROFILE.forEach((p, i) => {
  const q = PROFILE[(i + 1) % PROFILE.length];
  const prev = SIDES[(i - 1 + SIDES.length) % SIDES.length];
  EDGES.push({ a: [-HALF_W, p[0], p[1]], b: [-HALF_W, q[0], q[1]], faces: [CAP_L, SIDES[i]] });
  EDGES.push({ a: [HALF_W, p[0], p[1]], b: [HALF_W, q[0], q[1]], faces: [CAP_R, SIDES[i]] });
  EDGES.push({ a: [-HALF_W, p[0], p[1]], b: [HALF_W, p[0], p[1]], faces: [prev, SIDES[i]] });
});

// Yüzlere bağlı ayrıntılar: o yüz görünüyorsa çizilir.
const lerp2 = (p: [number, number], q: [number, number], t: number): [number, number] => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
function slopeRect(x0: number, x1: number, t0: number, t1: number): V3[] {
  const a = lerp2(PROFILE[2], PROFILE[3], t0);
  const b = lerp2(PROFILE[2], PROFILE[3], t1);
  return [
    [x0, a[0], a[1]],
    [x1, a[0], a[1]],
    [x1, b[0], b[1]],
    [x0, b[0], b[1]],
  ];
}
function circleOnFront(cx: number, cz: number, r: number, seg = 18): V3[] {
  return Array.from({ length: seg }, (_, i) => {
    const t = (i / seg) * Math.PI * 2;
    return [cx + Math.cos(t) * r, 80, cz + Math.sin(t) * r] as V3;
  });
}
const rectX = (x0: number, x1: number, y: number, z0: number, z1: number): V3[] => [
  [x0, y, z0],
  [x1, y, z0],
  [x1, y, z1],
  [x0, y, z1],
];
const sideVents = (x: number): V3[][] =>
  [0, 1, 2, 3, 4].map((i) => {
    const y = -58 + i * 12;
    return [
      [x, y, 32],
      [x, y + 5, 32],
      [x, y + 5, 74],
      [x, y, 74],
    ];
  });
const DETAILS: { face: Face; loops: V3[][] }[] = [
  // Eğik ön panel: ekran çerçevesi ve ekran.
  { face: SIDES[2], loops: [slopeRect(-88, 44, 0.16, 0.84), slopeRect(-82, 38, 0.26, 0.74)] },
  // Ön yüz: döner düğme, iki tuş, gösterge ışığı, bağlantı noktası.
  {
    face: SIDES[1],
    loops: [
      circleOnFront(76, 20, 11),
      circleOnFront(76, 20, 6, 12),
      rectX(30, 50, 80, 14, 26),
      rectX(6, 22, 80, 14, 26),
      circleOnFront(-64, 22, 4, 10),
      rectX(-36, -16, 80, 16, 23),
    ],
  },
  // Üst yüz: havalandırma yarıkları.
  {
    face: SIDES[3],
    loops: [0, 1, 2, 3, 4, 5].map((i) => {
      const x = -92 + i * 16;
      return [
        [x, -62, 95],
        [x + 7, -62, 95],
        [x + 7, -18, 95],
        [x, -18, 95],
      ] as V3[];
    }),
  },
  // Arka yüz: güç girişi ve etiket plakası.
  { face: SIDES[4], loops: [rectX(56, 92, -80, 18, 42), rectX(62, 86, -80, 24, 36), rectX(-70, -10, -80, 34, 66)] },
  { face: CAP_R, loops: sideVents(HALF_W) },
  { face: CAP_L, loops: sideVents(-HALF_W) },
];

// Ölçüler: iki nokta, öteleme yönü ve etiket.
const DIMS: { a: V3; b: V3; off: V3; label: string }[] = [
  { a: [-HALF_W, 80, 0], b: [HALF_W, 80, 0], off: [0, 30, 0], label: "220" },
  { a: [HALF_W, -80, 0], b: [HALF_W, 80, 0], off: [30, 0, 0], label: "160" },
  { a: [HALF_W, -80, 0], b: [HALF_W, -80, 95], off: [0, -30, 0], label: "95" },
];

const VB_W = 600;
const VB_H = 430;
const PITCH = 0.48;
const DIST = 900;
const SCALE = 1.42;

function makeProjector(yaw: number) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  const rot = (p: V3): V3 => {
    const x = p[0] * cy - p[1] * sy;
    const y = p[0] * sy + p[1] * cy;
    const z = p[2] - CENTER_Z;
    return [x, y * cp - z * sp, y * sp + z * cp];
  };
  const project = (p: V3): [number, number] => {
    const [x, d, z] = rot(p);
    const f = (DIST / (DIST + d)) * SCALE;
    return [VB_W / 2 + x * f, VB_H / 2 + 10 - z * f];
  };
  // Kamera +d yönüne bakıyor: normali kameraya dönük yüz görünür.
  const facing = (f: Face) => {
    const ny = f.n[0] * sy + f.n[1] * cy;
    return ny * cp - f.n[2] * sp < 0;
  };
  return { project, facing };
}

const seg = (pr: (p: V3) => [number, number], a: V3, b: V3) => {
  const p = pr(a);
  const q = pr(b);
  return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
};
const loop = (pr: (p: V3) => [number, number], pts: V3[]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${pr(p)[0].toFixed(1)} ${pr(p)[1].toFixed(1)}`).join("") + "Z";

// Kesit düzlemi x = s: profilin kendisi o konumda.
const SECTION_FRAME: [number, number][] = [
  [-104, -12],
  [104, -12],
  [104, 112],
  [-104, 112],
];

export function CadViewport({ labels, active }: { labels: CadLabels; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const visible = useRef<SVGPathElement>(null);
  const hidden = useRef<SVGPathElement>(null);
  const details = useRef<SVGPathElement>(null);
  const dims = useRef<SVGPathElement>(null);
  const dimLabels = useRef<(SVGTextElement | null)[]>([]);
  const section = useRef<SVGPathElement>(null);
  const sectionFrame = useRef<SVGPathElement>(null);
  const coords = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [cmd, setCmd] = useState({ i: 0, chars: 0 });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = active && inView;

  // Çizim döngüsü (~30 fps).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      // Ön panel kameraya dönük başlar, sonra yavaşça döner.
      const yaw = Math.PI - 0.62 + (reduce ? 0 : t * 0.2);
      const { project, facing } = makeProjector(yaw);
      let vis = "";
      let hid = "";
      for (const e of EDGES) {
        const d = seg(project, e.a, e.b);
        if (e.faces.some(facing)) vis += d;
        else hid += d;
      }
      let det = "";
      for (const d of DETAILS) if (facing(d.face)) det += d.loops.map((l) => loop(project, l)).join("");
      let dimPath = "";
      DIMS.forEach((dm, i) => {
        const a2: V3 = [dm.a[0] + dm.off[0], dm.a[1] + dm.off[1], dm.a[2] + dm.off[2]];
        const b2: V3 = [dm.b[0] + dm.off[0], dm.b[1] + dm.off[1], dm.b[2] + dm.off[2]];
        dimPath += seg(project, dm.a, a2) + seg(project, dm.b, b2) + seg(project, a2, b2);
        const pa = project(a2);
        const pb = project(b2);
        // Uçlarda kısa oklar yerine CAD'deki gibi kısa eğik çentikler.
        dimPath += [pa, pb].map((p) => `M${(p[0] - 4).toFixed(1)} ${(p[1] + 4).toFixed(1)}l8 -8`).join("");
        const label = dimLabels.current[i];
        if (label) {
          label.setAttribute("x", ((pa[0] + pb[0]) / 2).toFixed(1));
          label.setAttribute("y", ((pa[1] + pb[1]) / 2 - 6).toFixed(1));
        }
      });
      visible.current?.setAttribute("d", vis);
      hidden.current?.setAttribute("d", hid);
      details.current?.setAttribute("d", det);
      dims.current?.setAttribute("d", dimPath);

      // Kesit düzlemi: 10 sn'lik döngünün ilk 6 sn'sinde gövdeyi tarar.
      const phase = (t % 10) / 6;
      if (!reduce && phase <= 1) {
        const s = -HALF_W + phase * HALF_W * 2;
        section.current?.setAttribute("d", loop(project, PROFILE.map(([y, z]) => [s, y, z] as V3)));
        sectionFrame.current?.setAttribute("d", loop(project, SECTION_FRAME.map(([y, z]) => [s, y, z] as V3)));
        section.current?.setAttribute("opacity", "1");
        sectionFrame.current?.setAttribute("opacity", "1");
        if (coords.current) coords.current.textContent = `X ${s.toFixed(2)}   Y ${(60 * Math.sin(t)).toFixed(2)}   Z ${(47 + 30 * Math.cos(t * 0.7)).toFixed(2)}`;
      } else {
        section.current?.setAttribute("opacity", "0");
        sectionFrame.current?.setAttribute("opacity", "0");
      }
    };
    const loopFn = (now: number) => {
      if (now - last > 33) {
        last = now;
        draw(now);
      }
      raf = requestAnimationFrame(loopFn);
    };
    // İlk kare her zaman çizilir (durağan görünüm için de).
    draw(performance.now());
    if (running && !reduce) raf = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Komut satırı: komutu harf harf yazar, bitince bekleyip sonrakine geçer.
  useEffect(() => {
    if (!running) return;
    const current = labels.commands[cmd.i] ?? "";
    const id = window.setTimeout(
      () => {
        setCmd((c) => (c.chars < current.length ? { ...c, chars: c.chars + 1 } : { i: (c.i + 1) % labels.commands.length, chars: 0 }));
      },
      cmd.chars < current.length ? 55 : 1600
    );
    return () => window.clearTimeout(id);
  }, [running, cmd, labels.commands]);

  const previous = labels.commands[(cmd.i - 1 + labels.commands.length) % labels.commands.length];
  const typed = (labels.commands[cmd.i] ?? "").slice(0, cmd.chars);
  const activePart = cmd.i % labels.parts.length;

  return (
    <div ref={host} className="absolute inset-0 flex flex-col bg-tool text-[clamp(0.62rem,0.5rem+0.25vw,0.78rem)]">
      {/* Araç çubuğu */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-periwinkle/15 px-2" aria-hidden="true">
        {TOOL_ICONS.map((d, i) => (
          <span key={i} className={`grid size-7 place-items-center ${i === cmd.i % TOOL_ICONS.length ? "bg-accent text-accent-ink" : "text-periwinkle"}`}>
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d={d} />
            </svg>
          </span>
        ))}
        <span className="ml-auto pr-1 text-muted">{labels.view}</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Model ağacı */}
        <aside className="hidden w-[27%] shrink-0 border-r border-periwinkle/15 p-3 sm:block" aria-hidden="true">
          <p className="mb-2 text-muted">{labels.tree}</p>
          <ul className="grid gap-1">
            {labels.parts.map((p, i) => (
              <li key={p} className={`flex items-center gap-2 px-1.5 py-1 ${i === activePart ? "bg-surface-2 text-ink" : "text-muted"}`}>
                <span className={`size-1.5 shrink-0 ${i === activePart ? "bg-accent" : "bg-periwinkle/50"}`} />
                <span className="truncate">{p}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Görünüm alanı */}
        <div className="relative min-w-0 flex-1">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="color-mix(in oklab, var(--color-periwinkle) 7%, transparent)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={VB_W} height={VB_H} fill="url(#cad-grid)" />
            <path ref={sectionFrame} fill="none" stroke="color-mix(in oklab, var(--color-accent) 35%, transparent)" strokeWidth="1" strokeDasharray="5 5" />
            <path ref={hidden} fill="none" stroke="color-mix(in oklab, var(--color-periwinkle) 35%, transparent)" strokeWidth="1" strokeDasharray="4 4" />
            <path ref={visible} fill="none" stroke="var(--color-periwinkle)" strokeWidth="1.8" strokeLinejoin="round" />
            <path ref={details} fill="none" stroke="var(--color-periwinkle)" strokeWidth="1.2" />
            <path ref={section} fill="color-mix(in oklab, var(--color-accent) 10%, transparent)" stroke="var(--color-accent)" strokeWidth="2" />
            <path ref={dims} fill="none" stroke="var(--color-ink)" strokeOpacity="0.6" strokeWidth="1" />
            {DIMS.map((d, i) => (
              <text
                key={d.label}
                ref={(el) => {
                  dimLabels.current[i] = el;
                }}
                textAnchor="middle"
                fontSize="13"
                fontFamily="var(--font-mono)"
                fill="var(--color-ink)"
              >
                {d.label}
              </text>
            ))}
            {/* Eksen üçlüsü */}
            <g transform={`translate(34 ${VB_H - 30})`} fontSize="11" fontFamily="var(--font-mono)">
              <path d="M0 0H28" stroke="var(--color-ink)" strokeWidth="1.5" />
              <path d="M0 0V-28" stroke="var(--color-periwinkle)" strokeWidth="1.5" />
              <path d="M0 0L-16 12" stroke="var(--color-accent)" strokeWidth="1.5" />
              <text x="32" y="4" fill="var(--color-ink)">X</text>
              <text x="-4" y="-32" fill="var(--color-periwinkle)">Z</text>
              <text x="-28" y="20" fill="var(--color-accent)">Y</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Komut satırı ve durum çubuğu */}
      <div className="shrink-0 border-t border-periwinkle/15 px-3 py-2 font-mono" aria-hidden="true">
        <p className="truncate text-muted">&gt; {previous}</p>
        <p className="truncate text-ink">
          &gt; {typed}
          <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-accent" />
        </p>
      </div>
      <div className="flex shrink-0 justify-between gap-3 border-t border-periwinkle/15 bg-ground/60 px-3 py-1.5 font-mono text-muted" aria-hidden="true">
        <span ref={coords} className="truncate">
          X 0.00 Y 0.00 Z 0.00
        </span>
        <span className="shrink-0">{labels.units}</span>
      </div>
    </div>
  );
}

// Araç simgeleri: çizgi, yay, dikdörtgen, çekme, pah, ölçü, kesit.
const TOOL_ICONS = [
  "M2 13 14 3",
  "M2 13A11 11 0 0 1 14 3",
  "M2.5 4h11v8h-11z",
  "M4 12V6l4-3 4 3v6M4 6h8",
  "M2 13V7l4-4h8",
  "M2 12h12M2 9v6M14 9v6",
  "M8 1v14M3 4h10v8H3z",
];
