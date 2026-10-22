"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsapSetup";
import type { Product, ProductLayer } from "@/content/schema";
import { ControllerFace, ControllerKey, PushButton, WaterBathModel, WaterBathSteam } from "@/components/device/WaterBathModel";
import { SB9KPoster } from "@/components/device/SB9KPoster";
import type { InteractionLabels } from "../ProductInteractionView";
import { useOffscreenPause } from "@/lib/useOffscreenPause";
import { MiniTrend } from "./MiniTrend";
import { Icon } from "@/components/brand/Icon";
import type { MountResult, SectionLook, ViewerState } from "@/components/device/SB9KViewer";

// Gerçek CAD modeli (three.js) yalnız simülatör yaklaşınca yüklenir.
const loadViewer = () => import("@/components/device/SB9KViewer");
const SB9KViewer = dynamic(loadViewer, { ssr: false });

/**
 * Kontrolcünün ön paneli (ENDA ET2011 kılavuzu, "Modification of control set
 * points"): ekran normalde ölçülen sıcaklığı (PV) gösterir. SET → "C1.SE."
 * (kontrol ayar değeri); ilk ▲/▼ değeri gösterir, sonrakiler değiştirir; 3 sn
 * tuşa basılmazsa değer kaydedilir ve ekran PV'ye döner. SET yeniden basılınca
 * da PV'ye döner (alarm ayarı gibi diğer adımlar modellenmedi).
 */
type CtrlMode = "pv" | "label" | "sv";
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
  // WebGL modeli yüklenene kadar modelin statik görüntüsü (poster) görünür;
  // çizim (CSS) modeli yalnız WebGL hiç yüklenemezse ya da poster yoksa.
  const [webgl, setWebgl] = useState<"loading" | "ready" | "failed">(model3d ? "loading" : "failed");
  const poster = model3d?.poster;
  const [posterGone, setPosterGone] = useState(false);
  // three.js ve model (~150 KB JS + ~290 KB model) ancak simülatör ekrana
  // yaklaşınca yüklenir; o zamana kadar poster görünür.
  const [near, setNear] = useState(false);

  const [initial] = useState(() => createState(params));
  const sim = useRef(initial);
  const box = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [exploded, setExploded] = useState(false);
  const [snap, setSnap] = useState<Snapshot>(() => snapshotOf(initial));
  const [history, setHistory] = useState<Sample[]>(() => initial.history.slice());
  const [ctrl, setCtrl] = useState<CtrlMode>("pv");
  const ctrlRef = useRef<CtrlMode>("pv");
  const [keyAt, setKeyAt] = useState(0);
  // Lamlama: su yüzeyindeki kesitin görünen durumu (WebGL) ve son lamın sonucu.
  const [look, setLook] = useState<SectionLook | null | undefined>(undefined);
  const [mounted, setMounted] = useState<MountResult | null>(null);
  const refresh = useCallback(() => setSnap(snapshotOf(sim.current)), []);
  useOffscreenPause(box);

  const setMode = (m: CtrlMode) => {
    ctrlRef.current = m;
    setCtrl(m);
    setKeyAt((k) => k + 1);
  };
  useEffect(() => {
    if (ctrl === "pv") return;
    const id = window.setTimeout(() => {
      ctrlRef.current = "pv";
      setCtrl("pv");
    }, 3000);
    return () => window.clearTimeout(id);
  }, [ctrl, keyAt]);

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
      { rootMargin: "900px 0px" }
    );
    io.observe(area);
    return () => io.disconnect();
  }, [model3d]);

  // Model çizilince poster söner (300 ms), sonra DOM'dan kalkar.
  useEffect(() => {
    if (webgl !== "ready" || posterGone) return;
    const id = window.setTimeout(() => setPosterGone(true), 400);
    return () => window.clearTimeout(id);
  }, [webgl, posterGone]);

  // Boşta önceden indir: modül ve model, simülatöre gelmeden hazır olsun
  // (indirme ve modülün çalışması kaydırma sırasına denk gelmesin).
  useEffect(() => {
    const area = box.current;
    if (!area || !model3d) return;
    let idle = 0;
    const hasIdle = typeof window.requestIdleCallback === "function";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const warm = () => {
          void loadViewer();
          void fetch(model3d.src, { priority: "low" } as RequestInit).catch(() => {});
        };
        idle = hasIdle ? window.requestIdleCallback(warm, { timeout: 4000 }) : window.setTimeout(warm, 1200);
      },
      { rootMargin: "2400px 0px" }
    );
    io.observe(area);
    return () => {
      io.disconnect();
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
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
  const setPoint = (v: number | ((current: number) => number)) => {
    set((s) => {
      const next = typeof v === "function" ? v(s.setC) : v;
      s.setC = Math.min(params.maxC, Math.max(params.minC, Math.round(next * 10) / 10));
    });
  };
  const pressSet = () => {
    touched.current = true;
    if (!sim.current.on) return;
    setMode(ctrlRef.current === "pv" ? "label" : "pv");
  };
  const step = (dir: 1 | -1, size: number) => {
    touched.current = true;
    if (!sim.current.on || ctrlRef.current === "pv") return;
    if (ctrlRef.current === "sv") setPoint((c) => c + dir * size);
    setMode("sv");
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
  // WebGL'de yeni bırakılan kesit önce kırışıktır; görünen durum oradan gelir.
  const sectionShown: SectionLook | null = webgl === "ready" && look !== undefined ? look : snap.waterLow ? null : section.state;
  const mountedText: Record<MountResult, string> = { flat: t.slideFlat, wrinkled: t.slideWrinkled, tooHot: t.slideTooHot };
  const display = ctrl === "label" ? "C1.SE." : ctrl === "sv" ? snap.setC.toFixed(1) : snap.Ts.toFixed(1);
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
      display,
      blink: ctrl === "sv",
      ssr: snap.on && snap.duty > 0.02,
      alarm: snap.on && snap.Ts > snap.setC + 5,
      wrinkle: Math.round(section.wrinkle * 20) / 20,
      tooHot: section.state === "tooHot",
      exploded,
      activeLayer: activeLayer ?? null,
    }),
    [snap, display, ctrl, section.wrinkle, section.state, exploded, activeLayer]
  );

  const controller = (
    <ControllerFace
      display={snap.on ? display : ""}
      blink={snap.on && ctrl === "sv"}
      ssr={snap.on && snap.duty > 0.02}
      alarm={snap.on && snap.Ts > snap.setC + 5}
      keys={{
        up: (
          <ControllerKey label={t.increase} repeat={(size) => step(1, size)}>
            ▲
          </ControllerKey>
        ),
        set: (
          <ControllerKey label={t.setKey} onClick={pressSet}>
            SET
          </ControllerKey>
        ),
        down: (
          <ControllerKey label={t.decrease} repeat={(size) => step(-1, size)}>
            ▼
          </ControllerKey>
        ),
      }}
    />
  );

  const chip = "inline-flex items-center gap-2 px-3 py-2.5 text-small font-medium transition-colors duration-200";
  const quiet = "bg-surface-2 text-ink hover:bg-ink hover:text-ground";
  const alertTone = "bg-alert text-ground";

  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className="relative aspect-[4/5] cursor-grab touch-pan-y overflow-hidden bg-surface sm:aspect-[4/3] lg:aspect-square lg:max-h-[78svh]">
        {/* Sergi ışığı: cihazın üstünden düşen mavi bir koni. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(48% 62% at 50% 38%, rgb(62 82 224 / 0.2), transparent 100%)" }}
        />
        {/* Gerçek CAD modeli (WebGL); hazır olunca çizim modelinin yerini alır. */}
        {model3d && webgl !== "failed" ? (
          <div className="absolute inset-x-0 bottom-[14%] top-[18%] [container-type:size] lg:bottom-[11%] lg:top-[16%]">
            {/* Poster görüntüleyicinin altında: model ilk karesini çizince üstünü örter. */}
            {poster && !posterGone ? <SB9KPoster src={poster.src} box={poster.box} hidden={webgl === "ready"} /> : null}
            {near ? (
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
                  slideTake: t.slideTake,
                  slideRefill: t.slideRefill,
                }}
                onPower={() => set((s) => (s.on = !s.on))}
                onLight={() => set((s) => (s.light = !s.light))}
                onSet={pressSet}
                onStep={step}
                onMounted={setMounted}
                onRefill={() => setMounted(null)}
                onSection={setLook}
                onReady={() => setWebgl("ready")}
                onError={() => setWebgl("failed")}
              />
            ) : null}
          </div>
        ) : null}
        {/* Çizim modeli: WebGL yokken (ya da poster tanımlı değilken model
            yüklenirken). Gerçek model hazır olunca tamamen kalkar (saydam
            bırakmak her 100 ms'de büyük bir DOM ağacını yeniden çizdiriyordu). */}
        {webgl === "failed" || (webgl === "loading" && !poster) ? (
        <div className="absolute inset-x-0 bottom-[12%] top-[22%]">
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
        ) : null}

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
            {t.section}: <span className="text-ink">{sectionShown ? sectionText[sectionShown] : t.sectionNone}</span>
          </p>
          <p aria-live="polite" className="mt-1 flex max-w-[16rem] items-start gap-1.5 text-small text-ink">
            {mounted ? (
              <>
                <Icon name={mounted === "flat" ? "check" : "alert"} className={`mt-[0.2em] size-[1em] ${mounted === "flat" ? "text-accent" : "text-alert"}`} />
                {mountedText[mounted]}
              </>
            ) : null}
          </p>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 flex max-w-[55%] flex-col items-end gap-3">
          <p
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-right text-small font-semibold ${
              snap.status === "interlock" ? alertTone : snap.on ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"
            }`}
          >
            {snap.status === "interlock" ? <Icon name="alert" className="size-[1em]" strokeWidth={2} /> : null}
            {statusText[snap.status]}
          </p>
          <div className="hidden bg-ground/70 px-3 py-2 sm:block">
            <MiniTrend history={history} labels={{ title: t.chartTitle, temp: t.chartTemp, set: t.chartSet }} />
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-end gap-3 sm:justify-between">
          {/* Dar ekranda model bu satıra kadar iner; ipucu yalnız sm ve üstünde. */}
          <p className="pointer-events-none hidden max-w-[60%] text-small text-muted sm:block">
            {webgl === "ready" || (webgl === "loading" && poster) ? t.panelHintSlides : t.panelHint}
          </p>
          <button type="button" onClick={() => setExploded((v) => !v)} aria-pressed={exploded} className="btn btn-quiet min-h-0 py-2.5 text-small">
            <Icon name="layers" className="size-4" />
            {exploded ? t.assemble : t.explode}
          </button>
        </div>
      </div>

      {/* Hazır ayarlar (parafin türüne göre) ve senaryolar; çalıştırma ön panelde. */}
      <div className="flex flex-wrap items-center gap-2 bg-surface p-3">
        <span className="mr-1 inline-flex items-center gap-1.5 text-small text-muted">
          <Icon name="thermometer" className="size-4" />
          {t.presets}
        </span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPoint(p.setC)}
            aria-pressed={snap.setC === p.setC}
            className={`${chip} ${snap.setC === p.setC ? "bg-accent text-accent-ink" : quiet}`}
          >
            <span className="tabular-nums">{p.setC} °C</span>
            <span className={snap.setC === p.setC ? "text-accent-ink/80" : "text-muted"}>{presetLabel(p.label)}</span>
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-muted/30 sm:block" aria-hidden="true" />
        <button type="button" onClick={() => set((s) => (s.light = !s.light))} aria-pressed={snap.light} className={`${chip} ${quiet}`}>
          <Icon name="bulb" className="size-4" />
          {t.light}: <strong className="font-semibold">{snap.light ? t.on : t.off}</strong>
        </button>
        <button
          type="button"
          onClick={() => set((s) => (s.waterLow = !s.waterLow))}
          aria-pressed={snap.waterLow}
          className={`${chip} ${snap.waterLow ? alertTone : quiet}`}
        >
          <Icon name={snap.waterLow ? "alert" : "drop"} className="size-4" />
          {t.water}: <strong className="font-semibold">{snap.waterLow ? t.waterLow : t.waterOk}</strong>
        </button>
      </div>

      <p className="text-small text-muted">{t.disclaimer}</p>
    </div>
  );
}
