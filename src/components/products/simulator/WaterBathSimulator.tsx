"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import type { Product, ProductLayer } from "@/content/schema";
import { ControllerFace, ControllerKey, PushButton, WaterBathModel, WaterBathSteam } from "@/components/device/WaterBathModel";
import type { InteractionLabels } from "../ProductInteractionView";
import { useOffscreenPause } from "@/lib/useOffscreenPause";
import { MiniTrend } from "./MiniTrend";
import type { ViewerState } from "@/components/device/SB9KViewer";

// Gerçek CAD modeli (three.js) yalnız simülatör açılınca yüklenir.
const SB9KViewer = dynamic(() => import("@/components/device/SB9KViewer"), { ssr: false });
import {
  advance,
  createState,
  readParams,
  sectionOf,
  statusOf,
  type Sample,
  type SectionState,
  type Status,
  type WaterBathParams,
  type WaterBathState,
} from "./waterBathPhysics";

type Snapshot = {
  T: number;
  Ts: number;
  setC: number;
  duty: number;
  power: number;
  on: boolean;
  light: boolean;
  waterLow: boolean;
  status: Status;
};

function snapshotOf(s: WaterBathState): Snapshot {
  return {
    T: s.T,
    Ts: s.Ts,
    setC: s.setC,
    duty: s.duty,
    power: s.power,
    on: s.on,
    light: s.light,
    waterLow: s.waterLow,
    status: statusOf(s),
  };
}

/**
 * SB-9K'yı çalıştırın: güç ve LED düğmeleri, kontrolcünün SET/▲/▼ tuşları ön
 * panelde gerçek düğmelerdir. Su yüzeyindeki parafin kesiti sıcaklığa göre
 * açılır (temsili). Su azaltılınca rezistans ısınır ve ikincil termostat
 * ısıtıcıyı keser; kontrolcü bunu bilmez, OUT ışığı yanmaya devam eder.
 * Mekanik (gövde, hazne), elektronik (ısıtıcı, SSR, güç), gömülü (PID) ve
 * arayüz (PV/SV ekranı) aynı modelden beslenir.
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
  const params: WaterBathParams = useMemo(() => readParams(config?.params ?? {}), [config]);
  const presets = config?.presets ?? [];
  const model3d = config?.model3d;
  // WebGL modeli yüklenene kadar (ya da hiç yüklenemezse) çizim modeli görünür.
  const [webgl, setWebgl] = useState<"loading" | "ready" | "failed">(model3d ? "loading" : "failed");
  // three.js ve model (~150 KB JS + ~190 KB model) ancak simülatör ekrana
  // yaklaşınca yüklenir; o zamana kadar hafif çizim modeli görünür.
  const [near, setNear] = useState(false);

  const [initial] = useState(() => createState(params));
  const sim = useRef(initial);
  const box = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [exploded, setExploded] = useState(false);
  const [snap, setSnap] = useState<Snapshot>(() => snapshotOf(initial));
  const [history, setHistory] = useState<Sample[]>(() => initial.history.slice());
  // Ayar değişince SV kısa süre yanıp söner (gerçek kontrolcüdeki gibi); SET onaylar.
  const [editing, setEditing] = useState(false);
  const refresh = useCallback(() => setSnap(snapshotOf(sim.current)), []);
  useOffscreenPause(box);

  useEffect(() => {
    if (!editing) return;
    const id = window.setTimeout(() => setEditing(false), 2500);
    return () => window.clearTimeout(id);
  }, [editing, snap.setC]);

  // İlk kez yarısı görününce cihaz kendiliğinden açılır: ziyaretçi beklemede
  // bir ekran değil, ısınan bir banyo görür. Kullanıcı önce bir kontrole
  // dokunduysa ya da hareket azaltılmışsa açılmaz.
  useEffect(() => {
    const area = box.current;
    if (!area || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (touched.current) return;
        sim.current.on = true;
        refresh();
      },
      { threshold: 0.5 }
    );
    io.observe(area);
    return () => io.disconnect();
  }, [refresh]);

  useEffect(() => {
    const area = box.current;
    if (!area || !model3d) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setNear(true);
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(area);
    return () => io.disconnect();
  }, [model3d]);

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
      const heat = (Math.round(sim.current.power * 20) / 20).toFixed(2);
      if (el && heat !== lastHeat) {
        lastHeat = heat;
        el.style.setProperty("--heat", heat);
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
  // kaymadan sürükleme başlamaz: düğmelere tıklama böylece çalışır.
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
        startX = lastX = e.clientX;
      };
      const move = (e: PointerEvent) => {
        if (pending && !dragging && Math.abs(e.clientX - startX) > 5) {
          dragging = true;
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

  // İçini göster / katman vurgusu → model katmanlarına ayrılır.
  useGSAP(
    () => {
      if (!model.current) return;
      const open = exploded || !!activeLayer;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(model.current, { "--x": open ? 1 : 0, "--zoom": open ? 1.15 : 1.9, duration: reduce ? 0 : 0.9, ease: "expo.inOut" });
    },
    { dependencies: [exploded, activeLayer], scope: box }
  );

  const set = (fn: (s: WaterBathState) => void) => {
    touched.current = true;
    fn(sim.current);
    refresh();
  };
  // Ayar her zaman simülasyonun güncel değerinden hesaplanır: art arda hızlı
  // basışlar eski render değerine takılmasın.
  const setPoint = (v: number | ((current: number) => number), blink = true) => {
    set((s) => {
      const next = typeof v === "function" ? v(s.setC) : v;
      s.setC = Math.min(params.maxC, Math.max(params.minC, Math.round(next * 2) / 2));
    });
    setEditing(blink);
  };

  const statusText: Record<Status, string> = {
    off: t.statusOff,
    heating: t.statusHeating,
    holding: t.statusHolding,
    cooling: t.statusCooling,
    interlock: t.statusInterlock,
  };
  const sectionText: Record<SectionState, string> = {
    wrinkled: t.sectionWrinkled,
    opening: t.sectionOpening,
    flat: t.sectionFlat,
    tooHot: t.sectionTooHot,
  };
  const section = sectionOf(snap.T);
  const dutyPct = Math.round(snap.power * 100);
  const steam = snap.T > 55 ? (snap.T - 55) / 8 : 0;
  const lightOn = snap.on && snap.light;
  const presetLabel = (key: string) => (t as Record<string, string>)[key] ?? "";

  const viewerState: ViewerState = useMemo(
    () => ({
      on: snap.on,
      light: snap.light,
      waterLow: snap.waterLow,
      heat: Math.round(snap.power * 20) / 20,
      pv: snap.Ts.toFixed(1),
      sv: snap.setC.toFixed(1),
      out: snap.on && snap.duty > 0.02,
      alm: snap.on && snap.Ts > snap.setC + 5,
      svBlink: snap.on && editing,
      wrinkle: Math.round(section.wrinkle * 20) / 20,
      tooHot: section.state === "tooHot",
      exploded,
      activeLayer: activeLayer ?? null,
    }),
    [snap, editing, section.wrinkle, section.state, exploded, activeLayer]
  );

  const controller = (
    <ControllerFace
      pv={snap.on ? snap.Ts.toFixed(1) : "----"}
      sv={snap.setC.toFixed(1)}
      out={snap.on && snap.duty > 0.02}
      alm={snap.on && snap.Ts > snap.setC + 5}
      dim={!snap.on}
      svBlink={snap.on && editing}
      keys={
        <span className="flex gap-[0.18em]">
          <ControllerKey label={t.setKey} onClick={() => setEditing(false)}>
            SET
          </ControllerKey>
          <ControllerKey label={t.decrease} onClick={() => setPoint((c) => c - 0.5)}>
            ▼
          </ControllerKey>
          <ControllerKey label={t.increase} onClick={() => setPoint((c) => c + 0.5)}>
            ▲
          </ControllerKey>
        </span>
      }
    />
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
        {/* Gerçek CAD modeli (WebGL); hazır olunca çizim modelinin yerini alır. */}
        {model3d && near && webgl !== "failed" ? (
          <div className="absolute inset-x-0 bottom-[14%] top-[18%]">
            <SB9KViewer
              config={model3d}
              state={viewerState}
              labels={{
                power: `${t.powerButton}: ${snap.on ? t.on : t.off}`,
                light: `${t.lightButton}: ${lightOn ? t.on : t.off}`,
                set: t.setKey,
                up: t.increase,
                down: t.decrease,
                model: labels.modelAlt,
              }}
              onPower={() => set((s) => (s.on = !s.on))}
              onLight={() => set((s) => (s.light = !s.light))}
              onSet={() => setEditing(false)}
              onUp={() => setPoint((c) => c + 0.5)}
              onDown={() => setPoint((c) => c - 0.5)}
              onReady={() => setWebgl("ready")}
              onError={() => setWebgl("failed")}
            />
          </div>
        ) : null}
        {/* Çizim modeli: WebGL yokken ya da model yüklenirken. */}
        <div
          className={`absolute inset-x-0 bottom-[12%] top-[22%] transition-opacity duration-500 ${webgl === "ready" ? "pointer-events-none opacity-0" : ""}`}
          aria-hidden={webgl === "ready" || undefined}
          inert={webgl === "ready"}
        >
          <WaterBathModel
            ref={model}
            label={labels.modelAlt}
            active={activeLayer}
            waterLow={snap.waterLow}
            powerOn={snap.on}
            lightOn={snap.light}
            section={{ wrinkle: section.wrinkle, tooHot: section.state === "tooHot" }}
            controller={controller}
            powerButton={<PushButton label={`${t.powerButton}: ${snap.on ? t.on : t.off}`} on={snap.on} onClick={() => set((s) => (s.on = !s.on))} />}
            lightButton={
              <PushButton
                label={`${t.lightButton}: ${lightOn ? t.on : t.off}`}
                on={lightOn}
                tone="light"
                onClick={() => set((s) => (s.light = !s.light))}
              />
            }
            overlay={<WaterBathSteam intensity={steam} />}
            style={{ "--x": 0, "--rx": -22, "--zoom": 1.9, "--heat": 0 } as CSSProperties}
          />
        </div>

        <div className="pointer-events-none absolute left-4 top-4">
          <p className="text-small text-muted">{t.actual}</p>
          <p className="font-display text-[clamp(1.8rem,1.2rem+1.6vw,2.6rem)] font-medium leading-none tabular-nums">
            {snap.T.toFixed(1)}
            <span className="text-[0.5em] text-muted"> °C</span>
          </p>
          <p className="mt-2 text-small text-muted tabular-nums">
            {t.setpoint} <span className="text-ink">{snap.setC.toFixed(1)} °C</span> · {t.heater}{" "}
            <span className="text-ink">%{dutyPct}</span>
          </p>
          <p className="mt-1 text-small text-muted">
            {t.section}: <span className="text-ink">{sectionText[section.state]}</span>
          </p>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 flex max-w-[55%] flex-col items-end gap-3">
          <p
            aria-live="polite"
            className={`px-3 py-1.5 text-right text-small font-semibold ${
              snap.status === "interlock" ? alertTone : snap.on ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"
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

      {/* Hazır ayarlar (parafin türüne göre) ve senaryolar; çalıştırma ön panelde. */}
      <div className="flex flex-wrap items-center gap-2 bg-surface p-3">
        <span className="mr-1 text-small text-muted">{t.presets}</span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPoint(p.setC, false)}
            aria-pressed={snap.setC === p.setC}
            className={`${chip} ${snap.setC === p.setC ? "bg-accent text-accent-ink" : quiet}`}
          >
            <span className="tabular-nums">{p.setC} °C</span>
            <span className={snap.setC === p.setC ? "text-accent-ink/80" : "text-muted"}>{presetLabel(p.label)}</span>
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-muted/30 sm:block" aria-hidden="true" />
        <button type="button" onClick={() => set((s) => (s.light = !s.light))} aria-pressed={snap.light} className={`${chip} ${quiet}`}>
          {t.light}: <strong className="font-semibold">{snap.light ? t.on : t.off}</strong>
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
