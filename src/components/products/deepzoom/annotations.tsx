import type { MouseEvent as ReactMouseEvent } from "react";

/**
 * Görüntüleyicinin işaretleme katmanı: görüntü pikseli koordinatında
 * şekiller (poligon, dikdörtgen, mesafe). Katman OpenSeadragon'a görüntünün
 * tamamını kaplayan tek bir overlay olarak bağlanır; dokuyla birlikte büyür.
 * Çizgi kalınlığı ve etiket boyu ekranda sabit kalır (imgZoom'a bölünür).
 *
 * Ölçümler slaytın gerçek piksel boyutundan (nativeMpp, µm/px) hesaplanır.
 * Bunlar ölçüm aracıdır; klinik bir yorum ya da sonuç üretmez.
 */

export type Pt = [number, number];
export type Tool = "pan" | "polygon" | "rect" | "ruler";
export type Shape = { id: number; kind: "polygon" | "rect" | "ruler"; pts: Pt[] };

export function rectPoints(a: Pt, b: Pt): Pt[] {
  return [a, [b[0], a[1]], b, [a[0], b[1]]];
}

function polygonArea(pts: Pt[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function centroid(pts: Pt[]): Pt {
  const x = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const y = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return [x, y];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Bir şeklin ölçüsü: mesafe için uzunluk, alan için alan. */
export function measure(shape: Shape, mpp: number, nf: Intl.NumberFormat) {
  if (shape.kind === "ruler") {
    const um = dist(shape.pts[0], shape.pts[1]) * mpp;
    return um >= 1000 ? `${nf.format(+(um / 1000).toFixed(2))} mm` : `${nf.format(+um.toFixed(um < 100 ? 1 : 0))} µm`;
  }
  const um2 = polygonArea(shape.pts) * mpp * mpp;
  return um2 >= 100_000 ? `${nf.format(+(um2 / 1e6).toFixed(3))} mm²` : `${nf.format(Math.round(um2))} µm²`;
}

const EOSIN = "#e0518a";
const ACCENT = "#d7f89a";
const INK = "#eef0f6";
const GROUND = "#0a0c16";

type LayerProps = {
  width: number;
  height: number;
  /** Ekran pikseli / görüntü pikseli. */
  imgZoom: number;
  mpp: number;
  locale: string;
  shapes: Shape[];
  draft: Pt[];
  hover: Pt | null;
  tool: Tool;
  draftKind: Shape["kind"] | null;
  selected: number | null;
  visible: boolean;
  onSelect: (id: number) => void;
};

export function AnnotationLayer({
  width,
  height,
  imgZoom,
  mpp,
  locale,
  shapes,
  draft,
  hover,
  tool,
  draftKind,
  selected,
  visible,
  onSelect,
}: LayerProps) {
  if (!imgZoom) return null;
  const u = 1 / imgZoom; // bir ekran pikseli, görüntü biriminde
  const nf = new Intl.NumberFormat(locale);
  const label = (text: string, at: Pt, key: string) => (
    <text
      key={key}
      x={at[0]}
      y={at[1]}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={13 * u}
      fontWeight={600}
      fontFamily="var(--font-sans)"
      fill={INK}
      stroke={GROUND}
      strokeWidth={4 * u}
      paintOrder="stroke"
      style={{ pointerEvents: "none" }}
    >
      {text}
    </text>
  );

  // Çizim sürerken lastik bant: son noktadan imlece.
  const preview: Pt[] = hover && draft.length ? (draftKind === "rect" ? rectPoints(draft[0], hover) : [...draft, hover]) : draft;
  const selectable = tool === "pan";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{ overflow: "visible", pointerEvents: "none", opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
      aria-hidden="true"
    >
      {shapes.map((s) => {
        const on = s.id === selected;
        const stroke = on ? ACCENT : s.kind === "ruler" ? INK : EOSIN;
        const common = {
          stroke,
          strokeWidth: on ? 3 : 2.5,
          vectorEffect: "non-scaling-stroke" as const,
          style: { pointerEvents: selectable && visible ? ("visiblePainted" as const) : ("none" as const), cursor: selectable ? "pointer" : undefined },
          onClick: (e: ReactMouseEvent) => {
            if (!selectable) return;
            e.stopPropagation();
            onSelect(s.id);
          },
        };
        if (s.kind === "ruler") {
          const [a, b] = s.pts;
          const len = dist(a, b) || 1;
          // Uçlarda dik çentikler.
          const nx = (-(b[1] - a[1]) / len) * 7 * u;
          const ny = ((b[0] - a[0]) / len) * 7 * u;
          const mid: Pt = [(a[0] + b[0]) / 2 - nx * 2.2, (a[1] + b[1]) / 2 - ny * 2.2];
          return (
            <g key={s.id}>
              <path
                d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]} M${a[0] + nx} ${a[1] + ny} L${a[0] - nx} ${a[1] - ny} M${b[0] + nx} ${b[1] + ny} L${b[0] - nx} ${b[1] - ny}`}
                fill="none"
                {...common}
              />
              {/* Tıklaması kolay olsun diye görünmez kalın iz. */}
              <path d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} stroke="transparent" strokeWidth={14 * u} style={common.style} onClick={common.onClick} />
              {label(measure(s, mpp, nf), mid, `l${s.id}`)}
            </g>
          );
        }
        return (
          <g key={s.id}>
            <path
              d={`M${s.pts.map((p) => p.join(" ")).join(" L")} Z`}
              fill={on ? "rgb(215 248 154 / 0.12)" : "rgb(224 81 138 / 0.12)"}
              {...common}
            />
            {label(measure(s, mpp, nf), centroid(s.pts), `l${s.id}`)}
          </g>
        );
      })}

      {preview.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          <path
            d={`M${preview.map((p) => p.join(" ")).join(" L")}${draftKind === "rect" && preview.length === 4 ? " Z" : ""}`}
            fill="none"
            stroke={draftKind === "ruler" ? INK : EOSIN}
            strokeWidth={2}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
          {draft.map((p, i) => (
            <rect
              key={i}
              x={p[0] - 4 * u}
              y={p[1] - 4 * u}
              width={8 * u}
              height={8 * u}
              fill={i === 0 && draftKind === "polygon" ? ACCENT : INK}
              stroke={GROUND}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {draftKind === "ruler" && draft.length === 1 && hover &&
            label(measure({ id: -1, kind: "ruler", pts: [draft[0], hover] }, mpp, nf), [(draft[0][0] + hover[0]) / 2, (draft[0][1] + hover[1]) / 2 - 16 * u], "live")}
        </g>
      )}
    </svg>
  );
}
