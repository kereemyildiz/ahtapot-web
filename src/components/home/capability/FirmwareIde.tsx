"use client";

import { useEffect, useRef, useState } from "react";
import { advance, createState, readParams, type WaterBathState } from "@/components/products/simulator/waterBathPhysics";

export type IdeLabels = {
  files: string[];
  watch: string;
  terminal: string;
  plot: string;
  build: string;
  flash: string;
  running: string;
  ok: string;
};

/**
 * Gömülü yazılım katmanının sahnesi: bir IDE ve hata ayıklayıcı. Önce
 * derlenir ve karta yüklenir, sonra kontrol döngüsü adım adım çalışır:
 * çalışan satır ilerler, izleme panelindeki değişkenler, sıcaklık grafiği
 * ve seri terminal aynı PI modelinden (su banyosu simülatörü) canlı
 * beslenir. Ayar sıcaklığı ara ara değişir; kontrolcünün tepkisi görünür.
 * Temsili kod: ürünün gerçek kaynağı değil.
 */

type Tok = [string, "kw" | "fn" | "num" | "cm" | "pl"];
const CODE: Tok[][] = [
  [["void ", "kw"], ["control_tick", "fn"], ["(", "pl"], ["void", "kw"], [") {", "pl"]],
  [["  float ", "kw"], ["t = ", "pl"], ["probe_read", "fn"], ["();", "pl"]],
  [["  if ", "kw"], ["(!", "pl"], ["level_ok", "fn"], ["()) {", "pl"]],
  [["    heater_off", "fn"], ["();  ", "pl"], ["// interlock", "cm"]],
  [["    return", "kw"], [";", "pl"]],
  [["  }", "pl"]],
  [["  float ", "kw"], ["e = set - t;", "pl"]],
  [["  integ += ", "pl"], ["KI", "num"], [" * e * ", "pl"], ["DT", "num"], [";", "pl"]],
  [["  duty = ", "pl"], ["clamp", "fn"], ["(", "pl"], ["KP", "num"], [" * e + integ, ", "pl"], ["0.0f", "num"], [", ", "pl"], ["1.0f", "num"], [");", "pl"]],
  [["  pwm_write", "fn"], ["(HEATER, duty);", "pl"]],
  [["}", "pl"]],
  [["", "pl"]],
  [["static bool ", "kw"], ["level_ok", "fn"], ["(", "pl"], ["void", "kw"], [") {", "pl"]],
  [["  return ", "kw"], ["adc_read", "fn"], ["(LEVEL_CH) > ", "pl"], ["LEVEL_MIN", "num"], [";", "pl"]],
  [["}", "pl"]],
  [["", "pl"]],
  [["void ", "kw"], ["SysTick_Handler", "fn"], ["(", "pl"], ["void", "kw"], [") {", "pl"]],
  [["  if ", "kw"], ["(++ms % ", "pl"], ["100", "num"], [" == ", "pl"], ["0", "num"], [") ", "pl"], ["control_tick", "fn"], ["();", "pl"]],
  [["}", "pl"]],
];
// Normal yol: su seviyesi yeterli, kilit dalı atlanır.
const PATH = [0, 1, 2, 6, 7, 8, 9, 10];
const TONE: Record<Tok[1], string> = {
  kw: "text-periwinkle",
  fn: "text-ink",
  num: "text-accent",
  cm: "text-muted",
  pl: "text-ink/70",
};

const PLOT_N = 90;
const SETPOINTS = [37, 45, 37, 56];

type Snap = { T: number; set: number; e: number; duty: number; integ: number; time: number };

export function FirmwareIde({ labels, active }: { labels: IdeLabels; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const sim = useRef<WaterBathState | null>(null);
  const params = useRef(readParams({ startC: 22, initialSetC: 37, timeScale: 1 }));
  const simTime = useRef(0);
  const [inView, setInView] = useState(false);
  // Açılış: 0 derleniyor, 1 yükleniyor, 2 çalışıyor.
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(0);
  const [snap, setSnap] = useState<Snap>({ T: 22, set: 37, e: 15, duty: 0, integ: 0, time: 0 });
  const [plot, setPlot] = useState<{ T: number; set: number }[]>([]);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = active && inView;

  // Derleme ve yükleme çubuğu (hareket azaltılmışsa doğrudan çalışır).
  useEffect(() => {
    if (!running || stage === 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let p = 0;
    const id = window.setInterval(
      () => {
        p += reduce ? 100 : 8;
        if (p > 100) {
          window.clearInterval(id);
          setProgress(0);
          setStage((s) => Math.min(2, s + (reduce ? 2 : 1)));
          return;
        }
        setProgress(p);
      },
      reduce ? 0 : 70
    );
    return () => window.clearInterval(id);
  }, [running, stage]);

  // Çalışma: her adımda bir satır ilerler; döngü başında model ilerler.
  useEffect(() => {
    if (!running || stage !== 2) return;
    if (!sim.current) {
      sim.current = createState(params.current);
      sim.current.on = true;
      // Grafik boş başlamasın: soğuk başlangıçtan ısınma eğrisiyle doldur.
      const warm: { T: number; set: number }[] = [];
      for (let i = 0; i < 36; i++) {
        advance(sim.current, params.current, 40);
        simTime.current += 40;
        warm.push({ T: sim.current.Ts, set: sim.current.setC });
      }
      setPlot(warm);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let step = 0;
    let tick = 0;
    const id = window.setInterval(() => {
      step = (step + 1) % PATH.length;
      setLine(PATH[step]);
      if (step !== 0) return;
      const s = sim.current!;
      // Her 14 döngüde bir ayar değişir.
      tick++;
      s.setC = SETPOINTS[Math.floor(tick / 14) % SETPOINTS.length];
      advance(s, params.current, 40);
      simTime.current += 40;
      const next: Snap = { T: s.Ts, set: s.setC, e: s.setC - s.Ts, duty: s.duty, integ: s.integral, time: simTime.current };
      setSnap(next);
      setPlot((p) => [...p.slice(-(PLOT_N - 1)), { T: next.T, set: next.set }]);
      setLog((l) => [
        ...l.slice(-3),
        `[${next.time.toFixed(0).padStart(5)} s] T=${next.T.toFixed(2)} set=${next.set.toFixed(1)} duty=${next.duty.toFixed(2)}`,
      ]);
      // Hareket azaltılmışsa tek bir dolu durum yeterli.
      if (reduce && tick > 30) window.clearInterval(id);
    }, reduce ? 0 : 160);
    return () => window.clearInterval(id);
  }, [running, stage]);

  const lo = 15;
  const hi = 65;
  // Eldeki örnekler her zaman tüm genişliğe yayılır.
  const px = (i: number) => (i / Math.max(1, plot.length - 1)) * 200;
  const py = (v: number) => 60 - ((v - lo) / (hi - lo)) * 56;
  const line2 = (k: "T" | "set") => plot.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(p[k]).toFixed(1)}`).join(" ");

  const watch: [string, string][] = [
    ["t", `${snap.T.toFixed(2)} °C`],
    ["set", `${snap.set.toFixed(1)} °C`],
    ["e", snap.e.toFixed(2)],
    ["integ", snap.integ.toFixed(3)],
    ["duty", snap.duty.toFixed(2)],
  ];

  return (
    <div ref={host} className="absolute inset-0 flex flex-col bg-tool font-mono text-[clamp(0.6rem,0.48rem+0.25vw,0.76rem)]" aria-hidden="true">
      {/* Dosya sekmeleri ve durum */}
      <div className="flex h-9 shrink-0 items-center border-b border-periwinkle/15">
        {labels.files.map((f, i) => (
          <span key={f} className={`flex h-full items-center px-3 ${i === 0 ? "border-b-2 border-accent bg-surface text-ink" : "text-muted"}`}>
            {f}
          </span>
        ))}
        <span className={`ml-auto truncate pr-3 font-sans ${stage === 2 ? "text-accent" : "text-muted"}`}>
          {stage === 0 ? labels.build : stage === 1 ? labels.flash : labels.running}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[1fr_38%]">
        {/* Editör */}
        <div className="relative min-w-0 overflow-hidden py-3">
          {CODE.map((toks, i) => {
            const on = stage === 2 && i === line;
            return (
              <div key={i} className={`flex whitespace-pre leading-[1.75] ${on ? "bg-accent/15" : ""}`}>
                <span className={`w-5 shrink-0 text-center ${on ? "text-accent" : "text-transparent"}`}>▸</span>
                <span className="w-6 shrink-0 pr-2 text-right text-muted/60">{i + 1}</span>
                <span className="overflow-hidden text-ellipsis whitespace-pre">
                  {toks.map(([text, kind], j) => (
                    <span key={j} className={TONE[kind]}>
                      {text}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
          {stage < 2 && (
            <div className="absolute inset-x-4 bottom-4 bg-ground/90 p-3 font-sans">
              <p className="text-ink">{stage === 0 ? labels.build : labels.flash}</p>
              <div className="mt-2 h-1.5 bg-surface-2">
                <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* İzleme ve grafik */}
        <div className="hidden min-w-0 flex-col border-l border-periwinkle/15 sm:flex">
          <p className="border-b border-periwinkle/15 px-3 py-2 font-sans text-muted">{labels.watch}</p>
          <dl className="grid gap-1 px-3 py-2">
            {watch.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-periwinkle">{k}</dt>
                <dd className="tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-y border-periwinkle/15 px-3 py-2 font-sans text-muted">{labels.plot}</p>
          <svg viewBox="0 0 200 64" className="w-full flex-1 px-2 py-2" preserveAspectRatio="none">
            <path d={line2("set")} fill="none" stroke="var(--color-muted)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            <path d={line2("T")} fill="none" stroke="var(--color-accent)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>

      {/* Seri terminal */}
      <div className="shrink-0 border-t border-periwinkle/15 bg-ground/60 px-3 py-2">
        <p className="mb-1 font-sans text-muted">{labels.terminal}</p>
        {(stage === 2 ? log : [labels.ok]).map((l, i) => (
          <p key={`${i}-${l}`} className={`truncate ${i === log.length - 1 || stage < 2 ? "text-ink" : "text-muted"}`}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
