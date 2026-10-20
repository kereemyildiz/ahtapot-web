import type { Sample } from "./waterBathPhysics";

type MiniTrendProps = {
  history: Sample[];
  labels: { title: string; temp: string; set: string };
};

const W = 220;
const H = 64;
const PLOT_W = 168;
const PAD_Y = 6;

/**
 * Model kutusunun köşesindeki küçük iz: sensörün okuduğu sıcaklık (düz) ve
 * ayar (kesikli), son 40 dakika. Tek eksen, eksen yazısı yok; kimlik
 * lejant + uçtaki doğrudan etiketle, yalnız renkle değil.
 */
export function MiniTrend({ history, labels }: MiniTrendProps) {
  const n = history.length;
  const values = history.flatMap((s) => [s.T, s.set]);
  const lo = Math.floor(Math.min(...values) - 2);
  const hi = Math.ceil(Math.max(...values) + 2);
  const x = (i: number) => (i / (n - 1)) * PLOT_W;
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - PAD_Y * 2);
  const line = (key: "T" | "set") => history.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(s[key]).toFixed(1)}`).join(" ");
  const last = history[n - 1];

  return (
    <figure className="w-[13.75rem]">
      <figcaption className="mb-1 flex items-center gap-3 text-[0.75rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-3 bg-accent" aria-hidden="true" />
          {labels.temp}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-dashed border-muted" aria-hidden="true" />
          {labels.set}
        </span>
        <span className="ml-auto">{labels.title}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${labels.title}: ${labels.temp} ${last.T.toFixed(1)} °C, ${labels.set} ${last.set.toFixed(1)} °C`}
      >
        <path d={line("set")} fill="none" stroke="var(--color-muted)" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d={line("T")} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(n - 1)} cy={y(last.T)} r="3.5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
        <text x={PLOT_W + 8} y={y(last.T) + 4} fontSize="12" fontWeight="600" fill="var(--color-ink)" fontFamily="var(--font-sans)">
          {last.T.toFixed(1)}°
        </text>
      </svg>
    </figure>
  );
}
