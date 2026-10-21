"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import type { Product, ProductLayer } from "@/content/schema";
import { WaterBathDisplay, WaterBathModel, WaterBathSteam } from "@/components/device/WaterBathModel";
import type { InteractionLabels } from "../ProductInteractionView";
import { useOffscreenPause } from "@/lib/useOffscreenPause";
import { MiniTrend } from "./MiniTrend";
import {
  advance,
  createState,
  cycleTimer,
  readParams,
  statusOf,
  type Sample,
  type Status,
  type WaterBathParams,
  type WaterBathState,
} from "./waterBathPhysics";

type Snapshot = {
  T: number;
  Ts: number;
  setC: number;
  duty: number;
  running: boolean;
  lidOpen: boolean;
  waterLow: boolean;
  pumpOn: boolean;
  timerS: number;
  timerLeftS: number;
  timerCounting: boolean;
  status: Status;
};

function snapshotOf(s: WaterBathState, p: WaterBathParams): Snapshot {
  return {
    T: s.T,
    Ts: s.Ts,
    setC: s.setC,
    duty: s.duty,
    running: s.running,
    lidOpen: s.lidOpen,
    waterLow: s.waterLow,
    pumpOn: s.pumpOn,
    timerS: s.timerS,
    timerLeftS: s.timerLeftS,
    timerCounting: s.timerCounting,
    status: statusOf(s, p),
  };
}

/** Simülasyon saniyesini dk:sn olarak (zamanlayıcı ekranı). */
function clock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Ön paneldeki membran tuş: em biriminde, modelle birlikte ölçeklenir. */
function Key({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid place-items-center text-[1.1em] font-bold leading-none shadow-[inset_0_-0.14em_0_rgb(0_0_0/0.28)] transition-[background-color,transform] duration-150 active:translate-y-[0.06em] ${
        pressed ? "bg-accent text-accent-ink" : "bg-[#8c93a5] text-ground hover:bg-[#b4bacb]"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Su banyosunu çalıştırın: ön paneldeki tuşlarla ayarı değiştirin, kapağa
 * tıklayın, pompayı kapatıp kontrolün nasıl bozulduğunu görün. Çizim, ön
 * panel ekranı ve küçük iz aynı modelden beslenir: mekanik (gövde, kapak),
 * elektronik (sensör, ısıtıcı, pompa), gömülü yazılım (kontrolcü, güvenlik
 * kilidi, zamanlayıcı) ve arayüz (ekran, tuşlar) birlikte çalışır.
 */
export function WaterBathSimulator({
  product,
  labels,
  activeLayer,
}: {
  product: Product;
  labels: InteractionLabels;
  activeLayer?: ProductLayer | null;
}) {
  const t = labels.simulator;
  const config = product.assets.simulator;
  const params = useMemo(() => readParams(config?.params ?? {}), [config]);
  const presets = config?.presets ?? [];

  const [initial] = useState(() => createState(params));
  const sim = useRef(initial);
  const box = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const touched = useRef(false);
  const [exploded, setExploded] = useState(false);
  const [snap, setSnap] = useState<Snapshot>(() => snapshotOf(initial, params));
  const [history, setHistory] = useState<Sample[]>(() => initial.history.slice());
  const refresh = useCallback(() => setSnap(snapshotOf(sim.current, params)), [params]);
  useOffscreenPause(box);

  // İlk kez yarısı görününce cihaz kendiliğinden çalışmaya başlar: ziyaretçi
  // beklemede bir ekran değil, ısınan bir banyo görür. Kullanıcı önce bir
  // kontrole dokunduysa ya da hareket azaltılmışsa başlatılmaz.
  useEffect(() => {
    const area = box.current;
    if (!area || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (touched.current) return;
        sim.current.running = true;
        refresh();
      },
      { threshold: 0.5 }
    );
    io.observe(area);
    return () => io.disconnect();
  }, [refresh]);

  // Simülasyon döngüsü: görünürken çalışır, React'i ~10 Hz günceller.
  useEffect(() => {
    const area = box.current;
    if (!area) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "200px" });
    io.observe(area);
    let acc = 0;
    let accChart = 0;
    // Isı 0,05 adımlarla ve yalnız değişince yazılır: model kökündeki değişken
    // her yazımda bütün modelin stilini yeniden hesaplatır.
    let lastHeat = "";
    const tick = (_time: number, deltaMs: number) => {
      if (!visible) return;
      const dt = Math.min(deltaMs, 100) / 1000;
      advance(sim.current, params, dt * params.timeScale);
      const el = model.current;
      const heat = (Math.round(sim.current.duty * 20) / 20).toFixed(2);
      if (el && heat !== lastHeat) {
        lastHeat = heat;
        el.style.setProperty("--heat", heat);
        el.style.setProperty("--heat-on", sim.current.duty > 0.02 ? "1" : "0");
      }
      acc += dt;
      accChart += dt;
      if (acc > 0.1) {
        acc = 0;
        refresh();
      }
      if (accChart > 0.25) {
        accChart = 0;
        setHistory(sim.current.history.slice());
      }
    };
    gsap.ticker.add(tick);
    return () => {
      io.disconnect();
      gsap.ticker.remove(tick);
    };
  }, [params, refresh]);

  // Sürükleyerek döndürme (sayfa kaydırmasına dokunmaz). İmleç birkaç piksel
  // kaymadan sürükleme başlamaz: kapağa ve tuşlara tıklama böylece çalışır.
  useGSAP(
    () => {
      const area = box.current;
      const el = model.current;
      if (!area || !el) return;
      let ry = -30;
      let pending = false;
      let dragging = false;
      let startX = 0;
      let lastX = 0;
      el.style.setProperty("--ry", String(ry));
      const down = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        pending = true;
        dragged.current = false;
        startX = lastX = e.clientX;
      };
      const move = (e: PointerEvent) => {
        if (pending && !dragging && Math.abs(e.clientX - startX) > 5) {
          dragging = true;
          dragged.current = true;
          area.setPointerCapture(e.pointerId);
          area.style.cursor = "grabbing";
        }
        if (!dragging) return;
        ry += (e.clientX - lastX) * 0.45;
        lastX = e.clientX;
        el.style.setProperty("--ry", String(ry));
      };
      const up = () => {
        pending = false;
        dragging = false;
        area.style.cursor = "grab";
      };
      area.addEventListener("pointerdown", down);
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerup", up);
      area.addEventListener("pointercancel", up);
      return () => {
        area.removeEventListener("pointerdown", down);
        area.removeEventListener("pointermove", move);
        area.removeEventListener("pointerup", up);
        area.removeEventListener("pointercancel", up);
      };
    },
    { scope: box }
  );

  // İçini göster / katman vurgusu → model açılır.
  useGSAP(
    () => {
      if (!model.current) return;
      const open = exploded || !!activeLayer;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(model.current, { "--x": open ? 0.9 : 0, "--zoom": open ? 1.15 : 1.9, duration: reduce ? 0 : 0.9, ease: "expo.inOut" });
    },
    { dependencies: [exploded, activeLayer], scope: box }
  );

  useGSAP(
    () => {
      if (!model.current) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(model.current, { "--lid": snap.lidOpen ? 1 : 0, duration: reduce ? 0 : 0.6, ease: "power3.inOut" });
    },
    { dependencies: [snap.lidOpen], scope: box }
  );

  const set = (fn: (s: WaterBathState) => void) => {
    touched.current = true;
    fn(sim.current);
    refresh();
  };
  // Ayar her zaman simülasyonun güncel değerinden hesaplanır: art arda hızlı
  // basışlar eski render değerine takılmasın.
  const setPoint = (v: number | ((current: number) => number)) =>
    set((s) => {
      const next = typeof v === "function" ? v(s.setC) : v;
      s.setC = Math.min(params.maxC, Math.max(params.minC, Math.round(next * 2) / 2));
      s.timerCounting = false;
    });
  const togglePower = () =>
    set((s) => {
      s.running = !s.running;
      // Süre dolduktan sonra yeniden başlatılırsa zamanlayıcı baştan.
      if (s.running && s.timerDone) {
        s.timerDone = false;
        s.timerLeftS = s.timerS;
      }
    });
  const toggleLid = () => {
    if (dragged.current) return;
    set((s) => (s.lidOpen = !s.lidOpen));
  };

  const statusText: Record<Status, string> = {
    idle: t.statusIdle,
    heating: t.statusHeating,
    holding: t.statusHolding,
    cooling: t.statusCooling,
    interlock: t.statusInterlock,
    done: t.statusDone,
  };
  const dutyPct = Math.round(snap.duty * 100);
  const steam = snap.lidOpen && snap.T > 45 ? (snap.T - 45) / 15 : 0;
  const timerMin = snap.timerS / 60;
  const timerLine =
    snap.timerS === 0
      ? null
      : snap.timerCounting
        ? `${t.timer} ${clock(snap.timerLeftS)}`
        : `${t.timer} ${timerMin} ${t.minutes} · ${t.timerWaiting}`;

  const display =
    snap.status === "done" ? (
      <WaterBathDisplay value="End" sub="TIMER" alert />
    ) : snap.running && snap.waterLow ? (
      <WaterBathDisplay value="LO" sub="LEVEL" alert />
    ) : (
      <WaterBathDisplay
        value={snap.Ts.toFixed(1)}
        unit="°C"
        sub={snap.timerCounting ? `T ${clock(snap.timerLeftS)}` : `SET ${snap.setC.toFixed(1)}`}
        dim={!snap.running}
      />
    );

  const panel = (
    <div className="grid h-full grid-cols-2 gap-[0.35em]">
      <Key label={t.decrease} onClick={() => setPoint((c) => c - 0.5)}>
        −
      </Key>
      <Key label={t.increase} onClick={() => setPoint((c) => c + 0.5)}>
        +
      </Key>
      <Key label={snap.running ? t.stop : t.power} onClick={togglePower} pressed={snap.running}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[0.95em]" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M8 1.5v6M4.2 4.2a5 5 0 1 0 7.6 0" />
        </svg>
      </Key>
      <Key
        label={`${t.timer}: ${timerMin ? `${timerMin} ${t.minutes}` : t.timerOff}`}
        onClick={() => set(cycleTimer)}
        pressed={snap.timerS > 0}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[0.95em]" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="9" r="5.5" />
          <path d="M8 6v3h2.5M6 1.5h4" />
        </svg>
      </Key>
    </div>
  );

  const chip = "inline-flex items-center gap-2 px-3 py-2.5 text-small font-medium transition-colors duration-200";
  const quiet = "bg-surface-2 text-ink hover:bg-ink hover:text-ground";
  const alertTone = "bg-[#ff9db8] text-ground";

  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className="relative aspect-[4/5] cursor-grab touch-pan-y overflow-hidden bg-surface sm:aspect-[4/3]">
        {/* Sergi ışığı: cihazın üstünden düşen mavi bir koni. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(48% 62% at 50% 38%, rgb(62 82 224 / 0.2), transparent 100%)" }}
        />
        {/* Model, üstteki değerlerin altındaki alanda durur. */}
        <div className="absolute inset-x-0 bottom-[12%] top-[24%]">
          <WaterBathModel
            ref={model}
            label={labels.modelAlt}
            active={activeLayer}
            waterLow={snap.waterLow}
            pumpOn={snap.pumpOn}
            display={display}
            panel={panel}
            onLidClick={toggleLid}
            overlay={<WaterBathSteam intensity={steam} />}
            style={{ "--x": 0, "--rx": -16, "--zoom": 1.9, "--lid": 0, "--heat": 0, "--heat-on": 0 } as CSSProperties}
          />
        </div>

        <div className="pointer-events-none absolute left-4 top-4">
          <p className="text-small text-muted">{t.actual}</p>
          <p className="font-display text-[clamp(1.8rem,1.2rem+1.6vw,2.6rem)] font-medium leading-none tabular-nums">
            {snap.Ts.toFixed(1)}
            <span className="text-[0.5em] text-muted"> °C</span>
          </p>
          <p className="mt-2 text-small text-muted tabular-nums">
            {t.setpoint} <span className="text-ink">{snap.setC.toFixed(1)} °C</span> · {t.heater}{" "}
            <span className="text-ink">%{dutyPct}</span>
          </p>
          {timerLine && <p className="mt-1 text-small text-ink tabular-nums">{timerLine}</p>}
        </div>

        <div className="pointer-events-none absolute right-4 top-4 flex max-w-[55%] flex-col items-end gap-3">
          <p
            aria-live="polite"
            className={`px-3 py-1.5 text-right text-small font-semibold ${
              snap.status === "interlock" || snap.status === "done"
                ? alertTone
                : snap.running
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-2 text-ink"
            }`}
          >
            {statusText[snap.status]}
          </p>
          <div className="hidden bg-ground/70 px-3 py-2 sm:block">
            <MiniTrend history={history} labels={{ title: t.chartTitle, temp: t.chartTemp, set: t.chartSet }} />
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-end gap-3 sm:justify-between">
          {/* Dar ekranda model bu satıra kadar iner; ipucu yalnız sm ve üstünde. */}
          <p className="pointer-events-none hidden max-w-[60%] text-small text-muted sm:block">{t.panelHint}</p>
          <button type="button" onClick={() => setExploded((v) => !v)} aria-pressed={exploded} className="btn btn-quiet min-h-0 py-2.5 text-small">
            {exploded ? t.assemble : t.explode}
          </button>
        </div>
      </div>

      {/* Hazır ayarlar ve senaryolar tek satırda; çalıştırma ön panelde. */}
      <div className="flex flex-wrap items-center gap-2 bg-surface p-3">
        <span className="mr-1 text-small text-muted">{t.presets}</span>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPoint(p)}
            aria-pressed={snap.setC === p}
            className={`${chip} ${snap.setC === p ? "bg-accent text-accent-ink" : quiet}`}
          >
            {p} °C
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-muted/30 sm:block" aria-hidden="true" />
        <button type="button" onClick={toggleLid} aria-pressed={snap.lidOpen} className={`${chip} ${quiet}`}>
          {t.lid}: <strong className="font-semibold">{snap.lidOpen ? t.lidOpen : t.lidClosed}</strong>
        </button>
        <button
          type="button"
          onClick={() => set((s) => (s.pumpOn = !s.pumpOn))}
          aria-pressed={snap.pumpOn}
          className={`${chip} ${quiet}`}
        >
          {t.pump}: <strong className="font-semibold">{snap.pumpOn ? t.pumpOn : t.pumpOff}</strong>
        </button>
        <button
          type="button"
          onClick={() => set((s) => (s.waterLow = !s.waterLow))}
          aria-pressed={snap.waterLow}
          className={`${chip} ${snap.waterLow ? alertTone : quiet}`}
        >
          {t.water}: <strong className="font-semibold">{snap.waterLow ? t.waterLow : t.waterOk}</strong>
        </button>
      </div>

      <p className="text-small text-muted">{t.disclaimer}</p>
    </div>
  );
}
