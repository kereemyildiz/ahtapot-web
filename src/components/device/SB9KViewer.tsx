"use client";

import { useEffect, useRef, useState } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CubeTexture,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MixOperation,
  NeutralToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ProductLayer } from "@/content/constants";
import { holdRepeat } from "@/lib/holdRepeat";

/**
 * SB-9K'nın gerçek CAD modeli (WebGL). Model, ürünün SolidWorks montajından
 * tools/cad ile üretilir; kenar çizgileri de orada hesaplanıp modele gömülür
 * (tarayıcıda hesaplamak kaydırmayı ~0,3 sn kilitliyordu). Renk, katman ve
 * "İçini gösterin" hareketleri ürün JSON'undaki `model3d.parts` tablosundan.
 *
 * Üstüne yerleşenler gerçek ölçüde: kontrolcünün ön yüzü (ENDA ET2011
 * kılavuzundaki düzen: tek 4 haneli ekran, °F · C/A2 · SSR ışıkları, ▲ / SET / ▼),
 * su yüzeyi, yüzen parafin kesiti, logo ve önde bir lam tepsisi. Tepsiden lam
 * alınınca çalışma prensibi oynar: lam suya açılı daldırılır, kesitin altından
 * geçirilip kesitle birlikte çıkarılır (kullanım kılavuzu Ek-1, adım 5).
 * Düğmeler, tuşlar ve tepsi gerçek HTML düğmeleridir; 3B konumlarına
 * izdüşürülür (klavyeyle de çalışır). Tekerlek olayına dokunmaz.
 */

export type Model3dPart = {
  match: string;
  color: string;
  finish: "paint" | "metal" | "plastic" | "teflon" | "glass" | "rubber";
  layer?: ProductLayer;
  explode?: [number, number, number];
  role?: "controller" | "button" | "ledGlass" | "heater" | "container";
};

export type Model3dConfig = { src: string; anchors: string; parts: Model3dPart[] };

/** Su yüzeyindeki kesitin görünen durumu (yeni bırakılan kesit önce kırışıktır). */
export type SectionLook = "wrinkled" | "opening" | "flat" | "tooHot";
export type MountResult = "flat" | "wrinkled" | "tooHot";

export type ViewerState = {
  on: boolean;
  light: boolean;
  waterLow: boolean;
  heat: number;
  /** Kontrolcünün 4 haneli ekranındaki metin ("40.1", "C1.SE."); boşsa ekran sönük. */
  display: string;
  blink: boolean;
  ssr: boolean;
  alarm: boolean;
  /** Sıcaklığa göre kesit (0..1) ve fazla sıcak. */
  wrinkle: number;
  tooHot: boolean;
  exploded: boolean;
  activeLayer?: ProductLayer | null;
};

export type ViewerLabels = {
  power: string;
  light: string;
  set: string;
  up: string;
  down: string;
  model: string;
  slideTake: string;
  slideRefill: string;
};

type Anchors = {
  slantNormal: [number, number, number];
  controller: { center: [number, number, number]; width: number; height: number };
  buttons: { center: [number, number, number]; width: number; height: number }[];
  water: { min: [number, number, number]; max: [number, number, number]; levelFull: number; levelLow: number };
  logo: { center: [number, number, number]; width: number };
  bbox: [[number, number, number], [number, number, number]];
};

// Ortam haritası yok (PMREM üretimi ilk açılışta ~70 ms kilitliyordu): metaller
// ışıkla okunur, bu yüzden metalik değer düşük.
const FINISH: Record<Model3dPart["finish"], { roughness: number; metalness: number }> = {
  paint: { roughness: 0.5, metalness: 0 },
  metal: { roughness: 0.42, metalness: 0.25 },
  plastic: { roughness: 0.55, metalness: 0 },
  teflon: { roughness: 0.85, metalness: 0 },
  glass: { roughness: 0.1, metalness: 0 },
  rubber: { roughness: 0.9, metalness: 0 },
};

// --- 7 segment rakamlar (kontrolcünün LED ekranı) ---
const SEGS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc",
  "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "", C: "adef", S: "afgcd", E: "adefg",
};

function drawDigits(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, on: string, off: string) {
  const w = h * 0.52;
  const t = h * 0.13;
  const gap = w * 0.4;
  let cx = x;
  const chars = text.split("");
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ".") continue;
    const lit = SEGS[ch] ?? "";
    const seg = (name: string, sx: number, sy: number, sw: number, sh: number) => {
      const isOn = lit.includes(name);
      ctx.fillStyle = isOn ? on : off;
      ctx.shadowColor = isOn ? on : "transparent";
      ctx.shadowBlur = isOn ? h * 0.08 : 0;
      ctx.fillRect(sx, sy, sw, sh);
    };
    const mid = y + h / 2 - t / 2;
    seg("a", cx + t, y, w - 2 * t, t);
    seg("g", cx + t, mid, w - 2 * t, t);
    seg("d", cx + t, y + h - t, w - 2 * t, t);
    seg("f", cx, y + t, t, h / 2 - t);
    seg("b", cx + w - t, y + t, t, h / 2 - t);
    seg("e", cx, y + h / 2, t, h / 2 - t);
    seg("c", cx + w - t, y + h / 2, t, h / 2 - t);
    ctx.fillStyle = chars[i + 1] === "." ? on : off;
    ctx.fillRect(cx + w + gap * 0.3, y + h - t, t, t);
    cx += w + gap;
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

// Ön yüz 77 × 35 mm, tuval 10 px/mm. Konumlar ENDA ET2011 kılavuzundaki ön
// panel çiziminden: tuşlar sağda 2 × 2 (üstte °C etiketi ve ▲, altta SET ve ▼).
// Tuş konumları hem çizimde hem HTML düğmelerinin izdüşümünde kullanılır.
const KEYS = { set: [0.721, 0.697], up: [0.871, 0.363], down: [0.871, 0.683] } as const;
const TEAL = "#4fb3a2";

function drawController(tex: CanvasTexture, s: ViewerState, blinkOff: boolean) {
  const c = tex.image as HTMLCanvasElement;
  const ctx = c.getContext("2d")!;
  // Çizim 10 px/mm koordinatında (tuval de 10 px/mm: yazılar keskin kalsın).
  const W = 770;
  const H = 350;
  ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
  ctx.fillStyle = "#2c2f35";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 24px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#dfe2e8";
  ctx.fillText("°F", 104, 42);
  ctx.fillText("C/A2", 193, 42);
  ctx.fillText("SSR", 377, 42);
  // ekran camı ve durum ışıkları
  ctx.fillStyle = "#140707";
  ctx.fillRect(77, 61, 398, 231);
  const led = (x: number, lit: boolean) => {
    ctx.fillStyle = lit ? "#ff3b2f" : "#3b1515";
    ctx.beginPath();
    ctx.arc(x, 88, 7, 0, Math.PI * 2);
    ctx.fill();
  };
  led(104, false);
  led(193, s.on && s.alarm);
  led(377, s.on && s.ssr);
  const shown = s.on && !(s.blink && blinkOff) ? s.display : "";
  const digits = shown.replace(/\./g, "").length;
  drawDigits(ctx, " ".repeat(Math.max(0, 4 - digits)) + shown, 128, 128, 124, "#ff4433", "#1f0a0a");
  // tuş bölmesi
  ctx.fillStyle = "#3a3d44";
  ctx.beginPath();
  ctx.roundRect(497, 56, 250, 270, 26);
  ctx.fill();
  ctx.fillStyle = "#f1f2f5";
  ctx.font = "700 34px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("°C", 544, 125);
  ctx.font = "700 24px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("F", 634, 108);
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("SET", 555, 186);
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.moveTo(671, 100);
  ctx.lineTo(703, 154);
  ctx.lineTo(639, 154);
  ctx.fill();
  ctx.fillRect(526, 215, 58, 58);
  ctx.beginPath();
  ctx.moveTo(639, 212);
  ctx.lineTo(703, 212);
  ctx.lineTo(671, 266);
  ctx.fill();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  tex.needsUpdate = true;
}

/** Parafin şeridi: iki kesitlik, uzun ekseni tuvalin dikeyinde. */
function drawSection(c: HTMLCanvasElement, wrinkle: number, tooHot: boolean) {
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  const a = W * 0.08 * wrinkle;
  const side = (x: number, ph: number) => {
    const pts: [number, number][] = [];
    for (let y = H * 0.02; y <= H * 0.98; y += H * 0.02) pts.push([x + Math.sin((y + ph) / (H * 0.035)) * a, y]);
    return pts;
  };
  const outline = [...side(W * 0.08, 0), ...side(W * 0.92, H * 0.02).reverse()];
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = tooHot ? "rgba(238,240,246,0.5)" : "rgba(238,240,246,0.85)";
  ctx.fill();
  ctx.fillStyle = tooHot ? "rgba(214,196,180,0.5)" : "rgba(214,196,180,0.8)";
  const grow = tooHot ? 1.12 : 1;
  for (const cy of [0.28, 0.72]) {
    ctx.beginPath();
    ctx.ellipse(W / 2, H * cy, W * (0.3 - wrinkle * 0.06) * grow, H * (0.16 - wrinkle * 0.03) * grow, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (wrinkle > 0.05) {
    ctx.strokeStyle = `rgba(10,12,22,${0.4 * wrinkle})`;
    ctx.lineWidth = W * 0.035;
    for (const fy of [0.14, 0.4, 0.6, 0.86]) {
      ctx.beginPath();
      ctx.moveTo(W * 0.12, H * fy);
      ctx.lineTo(W * 0.5, H * fy + H * 0.025 * wrinkle);
      ctx.lineTo(W * 0.88, H * fy);
      ctx.stroke();
    }
  }
  if (tooHot) {
    // dağılma: şeritte açılan boşluklar
    ctx.globalCompositeOperation = "destination-out";
    for (const [x, y, r] of [
      [0.3, 0.2, 0.09],
      [0.7, 0.35, 0.07],
      [0.4, 0.55, 0.1],
      [0.65, 0.8, 0.08],
      [0.25, 0.9, 0.06],
    ]) {
      ctx.beginPath();
      ctx.arc(W * x, H * y, W * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
}

/**
 * Ana iş parçacığı boşken devam et. Kurulum adımları (WebGL bağlamı, modelin
 * ayrıştırılması, shader'lar) ayrı uzun görevlerdir; kaydırma karelerinin
 * arasına değil, boşluklara düşsünler.
 */
const idle = () =>
  new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 700 });
    else window.setTimeout(resolve, 40);
  });

/** Suyun yansıttığı oda: 6 küçük tuval (eşdikdörtgen doku küp haritaya çevrilirken ~25 ms kilitliyordu). */
function roomCube() {
  const face = (top: string, bottom: string, window_?: boolean) => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    if (window_) {
      ctx.fillStyle = "#eef0f6";
      ctx.fillRect(9, 7, 14, 9);
    }
    return c;
  };
  // +x, -x, +y, -y, +z, -z
  const tex = new CubeTexture([
    face("#3a4160", "#20243a"),
    face("#aab4e0", "#20243a", true),
    face("#4a5272", "#4a5272"),
    face("#0a0c16", "#0a0c16"),
    face("#5a6488", "#20243a"),
    face("#3a4160", "#20243a"),
  ]);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Lam: 76 × 26 × 1 mm cam, tutulan ucunda 20 mm buzlu etiket alanı (+z).
const SLIDE = { w: 0.026, t: 0.001, l: 0.076, frost: 0.02 };
const SLOTS = 5;
const PITCH = 0.032;
// Kesit (iki kesitlik şerit) su yüzeyinde: 20 × 46 mm.
const SEC = { w: 0.02, l: 0.046 };

type Hot = {
  el: HTMLButtonElement | null;
  world: Vector3;
  size: number;
  min: number;
  /** Ön panelde: panel kameraya dönükken görünür. */
  panel: boolean;
};

// yaw: lam havada çevrilir (π: buzlu uç arkada); tilt: tutulan uç yukarıda.
type Key = { t: number; pos: Vector3; tilt: number; yaw: number };

export default function SB9KViewer({
  config,
  state,
  labels,
  onPower,
  onLight,
  onSet,
  onStep,
  onMounted,
  onRefill,
  onSection,
  onReady,
  onError,
}: {
  config: Model3dConfig;
  state: ViewerState;
  labels: ViewerLabels;
  onPower: () => void;
  onLight: () => void;
  onSet: () => void;
  onStep: (dir: 1 | -1, size: number) => void;
  onMounted?: (result: MountResult) => void;
  onRefill?: () => void;
  onSection?: (look: SectionLook | null) => void;
  onReady?: () => void;
  onError?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const btnPower = useRef<HTMLButtonElement>(null);
  const btnLight = useRef<HTMLButtonElement>(null);
  const btnSet = useRef<HTMLButtonElement>(null);
  const btnUp = useRef<HTMLButtonElement>(null);
  const btnDown = useRef<HTMLButtonElement>(null);
  const btnSlide = useRef<HTMLButtonElement>(null);
  const [slidesLeft, setSlidesLeft] = useState(SLOTS);
  const stateRef = useRef(state);
  const apply = useRef<((s: ViewerState) => void) | null>(null);
  const slideAction = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onMounted, onRefill, onSection });
  useEffect(() => {
    callbacks.current = { onMounted, onRefill, onSection };
  });
  useEffect(() => {
    stateRef.current = state;
    apply.current?.(state);
  }, [state]);

  useEffect(() => {
    const container = canvasHost.current;
    const box = host.current;
    if (!container || !box) return;
    let disposed = false;
    // WebGL bağlamı kurulumdan önce boşta oluşturulur (aşağıda start()).
    let renderer: WebGLRenderer | null = null;

    const scene = new Scene();
    scene.add(new HemisphereLight("#e4e9ff", "#2a2238", 1.25));
    const key = new DirectionalLight("#ffffff", 1.7);
    key.position.set(-0.6, 1.2, 0.9);
    scene.add(key);
    const fill = new DirectionalLight("#c8d0ff", 0.55);
    fill.position.set(0.8, 0.4, -0.6);
    scene.add(fill);

    const camera = new PerspectiveCamera(24, 1, 0.05, 20);
    const root = new Group();
    scene.add(root);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let yaw = -0.62;
    let pitch = 0.6;
    let dist = 1.4;
    let explodeT = stateRef.current.exploded || stateRef.current.activeLayer ? 1 : 0;
    let explodeTarget = explodeT;
    let ready = false;
    let softDirty = false;
    let lastRender = 0;
    // Lamlama sırasında kamera kesite yaklaşır (0..1).
    let focusT = 0;
    let dirty = true;
    let visible = true;
    let raf = 0;

    const hots: Record<string, Hot> = {};
    const parts: { obj: Object3D; base: Vector3; cfg?: Model3dPart; mats: MeshStandardMaterial[]; edges: LineBasicMaterial[] }[] = [];
    let water: Mesh | null = null;
    let waterMat: MeshPhongMaterial | null = null;
    let ctrlTex: CanvasTexture | null = null;
    let anchors: Anchors | null = null;
    let lightButton: Object3D | null = null;
    let blinkOff = false;
    let blinkTimer = 0;
    let lastCtrl = "";
    let waterY = 0;

    // Kesit: su yüzeyinde yüzen şerit. placedAt: suya bırakıldığı an (yeni
    // bırakılan kesit önce kırışıktır, sıcaklık uygunsa ~1,5 sn'de açılır).
    let section: Mesh | null = null;
    let sectionCanvas: HTMLCanvasElement | null = null;
    let sectionTex: CanvasTexture | null = null;
    let sectionHome = new Vector3();
    let sectionPresent = true;
    let placedAt = -1e9;
    let lastSectionKey = "";
    let lastLook: SectionLook | null | undefined;

    // Lam tepsisi ve lamlar (tepsi kendi çizimimiz: temsili)
    type SlideObj = { g: Group; home: Vector3; used: boolean; mounted: Mesh | null };
    const slides: SlideObj[] = [];
    type Mount = { slide: SlideObj; t0: number; keys: Key[]; attached: boolean; result: MountResult };
    let mount: Mount | null = null;
    let dropAt = 0;

    // Kap boyutu ResizeObserver'dan; izdüşümde getBoundingClientRect her
    // karede yerleşimi zorla hesaplatıyordu.
    let width = 0;
    let height = 0;
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h || !renderer) return;
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Geniş sahnede sağ üstte grafik paneli var: kadraj hafif sola-aşağı kayar
      // (kare masaüstü sahnesinde altta ipucu satırı var, daha az aşağı).
      if (w >= 560) camera.setViewOffset(w, h, w * 0.05, -h * (h / w > 0.6 ? 0.01 : 0.045), w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) dirty = true;
    });
    io.observe(container);

    const placeCamera = () => {
      // Ayrışınca yığın yükselir: kamera geri çekilir, hedef yukarı kayar.
      const d = dist * (1 + 0.55 * explodeT) * (1 - 0.48 * focusT);
      const target = new Vector3(0, 0.045 * explodeT, 0).lerp(sectionHome.clone().add(root.position), focusT * 0.9);
      camera.position.set(
        target.x + d * Math.cos(pitch) * Math.sin(yaw),
        target.y + d * Math.sin(pitch),
        target.z + d * Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(target);
    };

    const nextClean = () => slides.find((s) => !s.used) ?? null;

    const project = () => {
      const rect = { width, height };
      const camDir = new Vector3();
      camera.getWorldDirection(camDir);
      const n = anchors ? new Vector3(...anchors.slantNormal) : new Vector3(0, 0, 1);
      const facing = n.dot(camDir) < -0.05;
      const s = stateRef.current;
      for (const [name, h] of Object.entries(hots)) {
        if (!h.el) continue;
        const p = h.world.clone().add(root.position).project(camera);
        const q = h.world.clone().add(root.position).add(new Vector3(h.size, 0, 0)).project(camera);
        const x = ((p.x + 1) / 2) * rect.width;
        const y = ((1 - p.y) / 2) * rect.height;
        const px = Math.max(h.min, Math.abs((q.x - p.x) / 2) * rect.width * 1.2);
        let show = explodeT < 0.05 && (!h.panel || facing);
        if (name === "slide") show = show && !mount && (!nextClean() || (sectionPresent && !s.waterLow));
        h.el.style.transform = `translate(${x - px / 2}px, ${y - px / 2}px)`;
        h.el.style.width = `${px}px`;
        h.el.style.height = `${px}px`;
        h.el.style.visibility = show ? "visible" : "hidden";
      }
    };

    /** Kesitin görünen durumu: sıcaklığa göre olan ile yeni bırakılmışlığın büyüğü. */
    const sectionLook = (now: number) => {
      const s = stateRef.current;
      const settle = s.wrinkle >= 1 || reduce ? 0 : Math.max(0, 1 - (now - placedAt) / 1500);
      const wrinkle = Math.max(s.wrinkle, settle);
      const tooHot = s.tooHot && settle < 0.3;
      const look: SectionLook = tooHot ? "tooHot" : wrinkle >= 0.6 ? "wrinkled" : wrinkle > 0.05 ? "opening" : "flat";
      return { wrinkle, tooHot, look };
    };

    const updateSection = (now: number) => {
      if (!section || !sectionCanvas || !sectionTex) return;
      const s = stateRef.current;
      const sl = sectionLook(now);
      const k = `${Math.round(sl.wrinkle * 20)}-${sl.tooHot}`;
      if (k !== lastSectionKey) {
        lastSectionKey = k;
        drawSection(sectionCanvas, Math.round(sl.wrinkle * 20) / 20, sl.tooHot);
        sectionTex.needsUpdate = true;
        dirty = true;
      }
      // Yeni kesit üstten suya iner.
      const drop = reduce ? 1 : Math.min(1, Math.max(0, (now - placedAt) / 350));
      section.position.set(sectionHome.x, waterY + 0.0006 + (1 - easeInOut(drop)) * 0.02, sectionHome.z);
      section.visible = sectionPresent && !s.waterLow && explodeT < 0.05;
      const look = sectionPresent && !s.waterLow ? sl.look : null;
      if (look !== lastLook) {
        lastLook = look;
        callbacks.current.onSection?.(look);
      }
    };

    // Görünen bir şey değişmedikçe yeniden çizilmez. Simülasyondan gelen
    // değişiklikler (ekrandaki ölçüm, ısıtıcı parlaklığı) en çok 4 Hz çizilir;
    // düğmeler, tuşlar, katman ve ayrışma anında çizilir.
    let lastVisual = "";
    let lastFast = "";
    const applyState = (s: ViewerState) => {
      const fast = [s.on, s.light, s.waterLow, s.blink, s.blink && blinkOff, s.exploded, s.activeLayer ?? "", s.blink || /^[\d ]/.test(s.display) ? "" : s.display].join("|");
      const visual = [fast, Math.round(s.heat * 10), s.display, s.ssr, s.alarm, s.wrinkle, s.tooHot].join("|");
      if (visual === lastVisual && parts.length) return;
      lastVisual = visual;
      const soft = fast === lastFast && !s.blink;
      lastFast = fast;
      explodeTarget = s.exploded || s.activeLayer ? 1 : 0;
      if (reduce) explodeT = explodeTarget;
      const lightOn = s.on && s.light;
      for (const p of parts) {
        const dim = s.activeLayer && p.cfg?.layer !== s.activeLayer;
        const glass = p.cfg?.finish === "glass";
        for (const m of p.mats) {
          m.opacity = dim ? 0.12 : glass ? 0.7 : 1;
          m.depthWrite = !dim && !glass;
          const role = p.cfg?.role;
          if (role === "ledGlass") {
            m.emissive.set(lightOn ? "#cfdcff" : "#000000");
            m.emissiveIntensity = lightOn ? 1.6 : 0;
          } else if (role === "heater") {
            m.emissive.set("#ff5a1f");
            m.emissiveIntensity = (Math.round(s.heat * 10) / 10) * 0.9;
          } else if (role === "button") {
            // Soldaki düğme güç, sağdaki LED aydınlatma (yükte belirlenir).
            const isLight = p.obj === lightButton;
            m.emissive.set(isLight ? "#eef0f6" : "#d7f89a");
            m.emissiveIntensity = (isLight ? lightOn : s.on) ? 0.75 : 0;
          }
        }
        for (const e of p.edges) e.opacity = dim ? 0.05 : 0.45;
      }
      if (water && waterMat && anchors) {
        waterY = s.waterLow ? anchors.water.levelLow : anchors.water.levelFull;
        water.position.y = waterY;
        waterMat.emissive.set(lightOn ? "#3e52e0" : "#000000");
        waterMat.emissiveIntensity = lightOn ? 0.22 : 0;
        waterMat.opacity = s.activeLayer && s.activeLayer !== "mekanik" ? 0.1 : 0.62;
      }
      updateSection(performance.now());
      if (ctrlTex) {
        const k = `${s.on}|${s.display}|${s.blink && blinkOff}|${s.ssr}|${s.alarm}`;
        if (k !== lastCtrl) {
          lastCtrl = k;
          drawController(ctrlTex, s, blinkOff);
        }
      }
      if (soft) softDirty = true;
      else dirty = true;
    };
    apply.current = applyState;

    // --- Lamlama: tepsiden lam al, suya açılı daldır, kesitin altından geçir, kesitle çıkar ---
    const placeSlide = (g: Object3D, pos: Vector3, tilt: number, yaw = 0) => {
      g.position.copy(pos);
      g.rotation.set(tilt, yaw, 0);
    };
    const mountedSection = (wrinkle: number, tooHot: boolean) => {
      const c = document.createElement("canvas");
      c.width = 80;
      c.height = 184;
      drawSection(c, wrinkle, tooHot);
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      const m = new Mesh(new PlaneGeometry(SEC.w, SEC.l), new MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, SLIDE.t / 2 + 0.0002, -0.01);
      return m;
    };
    const attach = (m: Mount, wrinkle: number, tooHot: boolean) => {
      m.attached = true;
      m.slide.mounted = mountedSection(wrinkle, tooHot);
      m.slide.g.add(m.slide.mounted);
      sectionPresent = false;
      updateSection(performance.now());
    };
    const finishMount = () => {
      if (!mount) return;
      const { slide, result } = mount;
      placeSlide(slide.g, slide.home, 0);
      mount = null;
      dropAt = performance.now() + (reduce ? 0 : 600);
      setSlidesLeft(slides.filter((s) => !s.used).length);
      callbacks.current.onMounted?.(result);
      dirty = true;
    };
    slideAction.current = () => {
      if (mount || !anchors) return;
      const free = nextClean();
      if (!free) {
        for (const s of slides) {
          s.used = false;
          if (s.mounted) {
            const mat = s.mounted.material as MeshStandardMaterial;
            s.g.remove(s.mounted);
            s.mounted.geometry.dispose();
            mat.map?.dispose();
            mat.dispose();
            s.mounted = null;
          }
        }
        setSlidesLeft(SLOTS);
        callbacks.current.onRefill?.();
        dirty = true;
        return;
      }
      if (!sectionPresent || stateRef.current.waterLow) return;
      const now = performance.now();
      const sl = sectionLook(now);
      const result: MountResult = sl.look === "tooHot" ? "tooHot" : sl.look === "flat" ? "flat" : "wrinkled";
      free.used = true;
      const S = new Vector3(sectionHome.x, waterY, sectionHome.z);
      const P0 = free.home;
      const lift = (v: Vector3, dy: number) => v.clone().add(new Vector3(0, dy, 0));
      const at = (dy: number, dz: number) => S.clone().add(new Vector3(0, dy, dz));
      // Lam havada çevrilir (buzlu uç arkada, yüzü kameraya dönük), kesitin
      // arkasından ~50° açıyla suya girer, altından öne geçer ve kesitle çıkar.
      // Konumlar lamın alt ucunu kesitin arka kenarına / altına getirecek şekilde.
      mount = {
        slide: free,
        t0: now,
        attached: false,
        result,
        keys: [
          { t: 0, pos: P0.clone(), tilt: 0, yaw: 0 },
          { t: 0.35, pos: lift(P0, 0.07), tilt: 0, yaw: 0 },
          { t: 1.1, pos: at(0.08, -0.06), tilt: 0.9, yaw: Math.PI },
          { t: 1.6, pos: at(0.0238, -0.0536), tilt: 0.9, yaw: Math.PI },
          { t: 2.1, pos: at(0.018, -0.0118), tilt: 0.75, yaw: Math.PI },
          { t: 2.8, pos: at(0.075, -0.045), tilt: 0.55, yaw: Math.PI },
          { t: 3.5, pos: lift(P0, 0.05), tilt: 0, yaw: 0 },
          { t: 3.9, pos: P0.clone(), tilt: 0, yaw: 0 },
        ],
      };
      if (reduce) {
        attach(mount, sl.wrinkle, sl.tooHot);
        finishMount();
        return;
      }
      dirty = true;
    };
    const stepMount = (now: number) => {
      if (!mount) return;
      const t = (now - mount.t0) / 1000;
      const ks = mount.keys;
      if (t >= ks[ks.length - 1].t) {
        finishMount();
        return;
      }
      let i = 0;
      while (i < ks.length - 2 && t > ks[i + 1].t) i++;
      const a = ks[i];
      const b = ks[i + 1];
      const u = easeInOut(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
      placeSlide(mount.slide.g, a.pos.clone().lerp(b.pos, u), a.tilt + (b.tilt - a.tilt) * u, a.yaw + (b.yaw - a.yaw) * u);
      // Lam kesitin altına girdiğinde kesit lama geçer.
      if (!mount.attached && t >= ks[4].t) {
        const sl = sectionLook(now);
        attach(mount, sl.wrinkle, sl.tooHot);
      }
      dirty = true;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const now = performance.now();
      const s = stateRef.current;
      if (s.blink && now - blinkTimer > 350) {
        blinkTimer = now;
        blinkOff = !blinkOff;
        applyState(s);
      } else if (!s.blink && blinkOff) {
        blinkOff = false;
        applyState(s);
      }
      if (mount) stepMount(now);
      const focusTarget = !reduce && mount && (now - mount.t0) / 1000 < 2.9 ? 1 : 0;
      if (Math.abs(focusT - focusTarget) > 0.001) {
        focusT += (focusTarget - focusT) * 0.06;
        if (Math.abs(focusT - focusTarget) < 0.002) focusT = focusTarget;
        dirty = true;
      }
      if (!sectionPresent && !mount && dropAt && now >= dropAt) {
        dropAt = 0;
        sectionPresent = true;
        placedAt = now;
        lastSectionKey = "";
      }
      if (now - placedAt < 1900) {
        updateSection(now);
        dirty = true;
      }
      if (Math.abs(explodeT - explodeTarget) > 0.001) {
        explodeT += (explodeTarget - explodeT) * 0.12;
        if (Math.abs(explodeT - explodeTarget) < 0.002) explodeT = explodeTarget;
        for (const p of parts) {
          const off = p.cfg?.explode;
          if (off) p.obj.position.set(p.base.x + off[0] * explodeT, p.base.y + off[1] * explodeT, p.base.z + off[2] * explodeT);
        }
        if (water) water.visible = explodeT < 0.5;
        updateSection(now);
        dirty = true;
      }
      if (softDirty && now - lastRender > 250) dirty = true;
      if (!dirty || !renderer || !ready) return;
      dirty = false;
      softDirty = false;
      lastRender = now;
      placeCamera();
      renderer.render(scene, camera);
      project();
    };

    // Sürükleyerek döndürme: yatay her girişte, dikey yalnız fareyle
    // (dokunmatikte dikey sürükleme sayfayı kaydırır).
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) box.style.cursor = "grabbing";
      lastX = e.clientX;
      lastY = e.clientY;
      yaw -= dx * 0.0075;
      if (e.pointerType === "mouse") pitch = Math.min(1.15, Math.max(0.12, pitch + dy * 0.005));
      dirty = true;
    };
    const up = () => {
      dragging = false;
      box.style.cursor = "grab";
    };
    box.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    const start = async () => {
      // Not: MeshoptDecoder.useWorkers kullanılmaz; Worker kodunu toString ile
      // kurar, üretim derlemesinin küçültmesi bunu bozuyor (çözme sessizce takılır).
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const files = Promise.all([
        fetch(config.src).then((r) => r.arrayBuffer()),
        fetch(config.anchors).then((r) => r.json() as Promise<Anchors>),
      ]);
      await idle();
      if (disposed) return;
      try {
        renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        onError?.();
        return;
      }
      // En az 2x: 1x ekranlarda süper örnekleme (kenarlar, logo ve ekran
      // yazısı keskin). Yalnız bir şey değişince çizildiği için maliyeti düşük.
      renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 2), 2.5));
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = NeutralToneMapping;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      const [buf, a] = await files;
      await idle();
      if (disposed) return;
      const gltf = await loader.parseAsync(buf, "");
      await idle();
      if (disposed) return;
      anchors = a;
      root.add(gltf.scene);

      // Parçalar: en üstteki adlandırılmış düğümler. Kenarlar modelde çizgi
      // olarak gelir (tools/cad); burada yalnız malzeme atanır.
      for (const node of [...gltf.scene.children]) {
        const name = String(node.userData?.part ?? node.name);
        const cfg = config.parts.find((p) => name.includes(p.match));
        const mats: MeshStandardMaterial[] = [];
        const edges: LineBasicMaterial[] = [];
        const fin = FINISH[cfg?.finish ?? "paint"];
        const color = new Color(cfg?.color ?? "#c9ced5");
        const dark = color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.22;
        node.traverse((o) => {
          if ((o as LineSegments).isLineSegments) {
            const em = new LineBasicMaterial({ color: dark ? "#4a4f5c" : "#1b1e27", transparent: true, opacity: 0.45 });
            (o as LineSegments).material = em;
            o.renderOrder = 1;
            edges.push(em);
          } else if ((o as Mesh).isMesh) {
            // Hepsi baştan saydam geçişte: katman vurgusunda opaklık değişince
            // shader yeniden derlenmesin.
            const mat = new MeshStandardMaterial({
              color,
              roughness: fin.roughness,
              metalness: fin.metalness,
              side: DoubleSide,
              transparent: true,
            });
            (o as Mesh).material = mat;
            mats.push(mat);
          }
        });
        parts.push({ obj: node, base: node.position.clone(), cfg, mats, edges });
      }

      const buttons = parts.filter((p) => p.cfg?.role === "button").sort((p, q) => p.base.x - q.base.x);
      lightButton = buttons[1]?.obj ?? null;

      const upN = new Vector3(...a.slantNormal);
      const tilt = -Math.atan2(upN.y, upN.z);
      // Kontrolcü ön yüzü (77 × 35 mm)
      const cvs = document.createElement("canvas");
      cvs.width = 770;
      cvs.height = 350;
      ctrlTex = new CanvasTexture(cvs);
      ctrlTex.colorSpace = SRGBColorSpace;
      ctrlTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const face = new Mesh(
        new PlaneGeometry(a.controller.width, a.controller.height),
        new MeshStandardMaterial({ map: ctrlTex, roughness: 0.35, metalness: 0, emissive: "#ffffff", emissiveMap: ctrlTex, emissiveIntensity: 0.5 })
      );
      face.position.set(...a.controller.center).addScaledVector(upN, 0.0006);
      face.rotation.x = tilt;
      root.add(face);
      face.updateMatrix();
      const keyWorld = (u: number, v: number) =>
        new Vector3((u - 0.5) * a.controller.width, (0.5 - v) * a.controller.height, 0.002).applyMatrix4(face.matrix);
      // Tuşlar ~11 mm aralıklı: vuruş alanı aralıktan büyük olursa komşu tuşa taşar.
      const keySize = 0.009;
      hots.set = { el: btnSet.current, world: keyWorld(...KEYS.set), size: keySize, min: 8, panel: true };
      hots.down = { el: btnDown.current, world: keyWorld(...KEYS.down), size: keySize, min: 8, panel: true };
      hots.up = { el: btnUp.current, world: keyWorld(...KEYS.up), size: keySize, min: 8, panel: true };
      const [b0, b1] = a.buttons;
      if (b0) hots.power = { el: btnPower.current, world: new Vector3(...b0.center), size: b0.width, min: 28, panel: true };
      if (b1) hots.light = { el: btnLight.current, world: new Vector3(...b1.center), size: b1.width, min: 28, panel: true };

      // Logo (çizimde yok; panelin boş sol kısmına). Üründe açık renk baskı
      // (ürün fotoğrafı): logonun şekli beyaz serigrafi olarak basılır.
      const logoImg = new Image();
      logoImg.onload = () => {
        if (disposed || !renderer) return;
        const img = logoImg;
        const pc = document.createElement("canvas");
        pc.width = img.naturalWidth;
        pc.height = img.naturalHeight;
        const pctx = pc.getContext("2d")!;
        pctx.drawImage(img, 0, 0);
        pctx.globalCompositeOperation = "source-in";
        pctx.fillStyle = "#f6f4f8";
        pctx.fillRect(0, 0, pc.width, pc.height);
        const tex = new CanvasTexture(pc);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const w = a.logo.width;
        const h = (w * img.naturalHeight) / img.naturalWidth;
        const logo = new Mesh(
          new PlaneGeometry(w, h),
          new MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.18 })
        );
        logo.position.set(...a.logo.center).addScaledVector(upN, 0.0004);
        logo.rotation.x = tilt;
        root.add(logo);
        dirty = true;
      };
      logoImg.src = "/brand/logo-full.png";

      // Su: ortam haritası yerine küçük bir odayı (pencere, tavan) yansıtır.
      const envTex = roomCube();
      const wx = a.water.max[0] - a.water.min[0];
      const wz = a.water.max[2] - a.water.min[2];
      const wcx = (a.water.min[0] + a.water.max[0]) / 2;
      const wcz = (a.water.min[2] + a.water.max[2]) / 2;
      waterMat = new MeshPhongMaterial({
        color: "#0b1026",
        specular: "#5a6488",
        shininess: 90,
        envMap: envTex,
        combine: MixOperation,
        reflectivity: 0.32,
        transparent: true,
        opacity: 0.62,
      });
      water = new Mesh(new PlaneGeometry(wx, wz), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(wcx, a.water.levelFull, wcz);
      root.add(water);
      waterY = a.water.levelFull;

      // Kesit: tepsiye yakın ön-sol çeyrekte, uzun ekseni lamla aynı yönde (z).
      sectionHome = new Vector3(wcx - wx * 0.2, waterY, wcz + wz * 0.15);
      sectionCanvas = document.createElement("canvas");
      sectionCanvas.width = 160;
      sectionCanvas.height = 368;
      sectionTex = new CanvasTexture(sectionCanvas);
      sectionTex.colorSpace = SRGBColorSpace;
      section = new Mesh(new PlaneGeometry(SEC.w, SEC.l), new MeshStandardMaterial({ map: sectionTex, transparent: true, roughness: 0.6 }));
      section.rotation.x = -Math.PI / 2;
      root.add(section);

      // Lam tepsisi (temsili): cihazın önünde, sol yarıda; 5 yuva.
      const [lo, hi] = a.bbox;
      const trayW = SLOTS * PITCH + 0.012;
      const trayD = SLIDE.l + 0.014;
      // Taban ve yuva kaburgaları tek geometri (tek çizim çağrısı).
      const trayParts = [new BoxGeometry(trayW, 0.004, trayD).translate(0, 0.002, 0)];
      for (let k = 0; k <= SLOTS; k++) {
        trayParts.push(new BoxGeometry(0.0015, 0.004, trayD).translate(-trayW / 2 + 0.006 + k * PITCH, 0.006, 0));
      }
      const tray = new Mesh(mergeGeometries(trayParts), new MeshStandardMaterial({ color: "#e9ebee", roughness: 0.6 }));
      trayParts.forEach((g) => g.dispose());
      const trayPos = new Vector3(lo[0] + trayW / 2 + 0.02, lo[1], hi[2] + 0.02 + trayD / 2);
      tray.position.copy(trayPos);
      root.add(tray);
      const glassMat = new MeshStandardMaterial({ color: "#d6e4f2", roughness: 0.05, transparent: true, opacity: 0.5 });
      const glassEdge = new LineBasicMaterial({ color: "#eef0f6", transparent: true, opacity: 0.8 });
      const frostMat = new MeshStandardMaterial({ color: "#f1f2f4", roughness: 0.9 });
      const glassGeo = new BoxGeometry(SLIDE.w, SLIDE.t, SLIDE.l);
      const frostGeo = new BoxGeometry(SLIDE.w, SLIDE.t * 1.2, SLIDE.frost);
      const glassEdges = new EdgesGeometry(glassGeo);
      for (let k = 0; k < SLOTS; k++) {
        const g = new Group();
        g.add(new Mesh(glassGeo, glassMat));
        g.add(new LineSegments(glassEdges, glassEdge));
        const fr = new Mesh(frostGeo, frostMat);
        fr.position.z = SLIDE.l / 2 - SLIDE.frost / 2;
        g.add(fr);
        const home = trayPos.clone().add(new Vector3(-trayW / 2 + 0.006 + PITCH / 2 + k * PITCH, 0.0045 + SLIDE.t / 2, 0));
        placeSlide(g, home, 0);
        root.add(g);
        slides.push({ g, home, used: false, mounted: null });
      }
      hots.slide = { el: btnSlide.current, world: trayPos.clone().add(new Vector3(0, 0.005, 0)), size: trayW * 0.6, min: 44, panel: false };

      // Kadraj: cihaz + tepsi
      const minV = new Vector3(lo[0], lo[1], lo[2]);
      const maxV = new Vector3(hi[0], hi[1], Math.max(hi[2], trayPos.z + trayD / 2));
      const center = minV.clone().add(maxV).multiplyScalar(0.5);
      root.position.copy(center).negate();
      dist = (maxV.clone().sub(minV).length() / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 0.85;

      // Tezgâha düşen yumuşak temas gölgesi
      const sh = document.createElement("canvas");
      sh.width = sh.height = 128;
      const sctx = sh.getContext("2d")!;
      const g = sctx.createRadialGradient(64, 64, 8, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 128, 128);
      const shadow = new Mesh(
        new PlaneGeometry((hi[0] - lo[0]) * 1.5, (hi[2] - lo[2]) * 1.35),
        new MeshStandardMaterial({ map: new CanvasTexture(sh), transparent: true, depthWrite: false, roughness: 1 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set((lo[0] + hi[0]) / 2, lo[1] - 0.0015, (lo[2] + hi[2]) / 2);
      root.add(shadow);

      resize();
      applyState(stateRef.current);
      for (const p of parts) {
        const off = p.cfg?.explode;
        if (off) p.obj.position.set(p.base.x + off[0] * explodeT, p.base.y + off[1] * explodeT, p.base.z + off[2] * explodeT);
      }
      placeCamera();
      await idle();
      if (disposed) return;
      // Shader'lar paralel derlenir (KHR_parallel_shader_compile): bağlantı
      // denetimi ana iş parçacığını beklemez.
      await renderer.compileAsync(scene, camera);
      await idle();
      if (disposed) return;
      // Ön çizim 1 × 1 piksellik alana: dokular ve geometri GPU'ya yüklenir,
      // asıl ilk çizim sıradan bir kare kadar sürer.
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, 1, 1);
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
      await idle();
      if (disposed) return;
      ready = true;
      dirty = true;
      onReady?.();
    };
    start().catch(() => {
      if (!disposed) onError?.();
    });

    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      apply.current = null;
      slideAction.current = null;
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          x.map?.dispose();
          x.dispose();
        });
      });
      waterMat?.envMap?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
    // Kurulum bir kez; durum değişiklikleri apply ile gelir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.src]);

  const hot = "absolute left-0 top-0 z-10 cursor-pointer rounded-none bg-transparent outline-none focus-visible:outline-2 focus-visible:outline-accent";
  const slideLabel = slidesLeft ? labels.slideTake : labels.slideRefill;
  return (
    <div ref={host} className="absolute inset-0 cursor-grab" role="group" aria-label={labels.model}>
      <div ref={canvasHost} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
      <button ref={btnPower} type="button" className={hot} aria-label={labels.power} aria-pressed={state.on} onClick={onPower} style={{ visibility: "hidden" }} />
      <button ref={btnLight} type="button" className={hot} aria-label={labels.light} aria-pressed={state.on && state.light} onClick={onLight} style={{ visibility: "hidden" }} />
      <button ref={btnSet} type="button" className={hot} aria-label={labels.set} onClick={onSet} style={{ visibility: "hidden" }} />
      <button ref={btnDown} type="button" className={hot} aria-label={labels.down} {...holdRepeat((size) => onStep(-1, size))} style={{ visibility: "hidden" }} />
      <button ref={btnUp} type="button" className={hot} aria-label={labels.up} {...holdRepeat((size) => onStep(1, size))} style={{ visibility: "hidden" }} />
      <button
        ref={btnSlide}
        type="button"
        className={hot}
        aria-label={slideLabel}
        title={slideLabel}
        onClick={() => slideAction.current?.()}
        style={{ visibility: "hidden" }}
      />
    </div>
  );
}
