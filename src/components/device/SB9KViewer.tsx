"use client";

import { useEffect, useRef } from "react";
import {
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ProductLayer } from "@/content/constants";

/**
 * SB-9K'nın gerçek CAD modeli (WebGL). Model, ürünün SolidWorks montajından
 * tools/cad ile üretilir: Parasolid B-rep'ten düz/silindir/koni yüzeyler,
 * ekran listelerinden diğerleri; gltfpack ile sıkıştırılır. Renk, katman ve
 * "İçini gösterin" hareketleri ürün JSON'undaki `model3d.parts` tablosundan.
 *
 * Üstüne yerleşenler gerçek ölçüde: kontrolcü yüzünde 7 segment PV/SV ekranı,
 * su yüzeyi, yüzen parafin kesiti, logo. Düğmeler ve tuşlar gerçek HTML
 * düğmeleridir; 3B konumlarına izdüşürülür (klavyeyle de çalışır).
 * Tekerlek olayına dokunmaz (scroll-jack yok); yalnız sürükleme döndürür.
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

export type ViewerState = {
  on: boolean;
  light: boolean;
  waterLow: boolean;
  heat: number;
  pv: string;
  sv: string;
  out: boolean;
  alm: boolean;
  svBlink: boolean;
  wrinkle: number;
  tooHot: boolean;
  exploded: boolean;
  activeLayer?: ProductLayer | null;
};

export type ViewerLabels = { power: string; light: string; set: string; up: string; down: string; model: string };

type Anchors = {
  slantNormal: [number, number, number];
  controller: { center: [number, number, number]; width: number; height: number };
  buttons: { center: [number, number, number]; width: number; height: number }[];
  water: { min: [number, number, number]; max: [number, number, number]; levelFull: number; levelLow: number };
  logo: { center: [number, number, number]; width: number };
  bbox: [[number, number, number], [number, number, number]];
};

const FINISH: Record<Model3dPart["finish"], { roughness: number; metalness: number }> = {
  paint: { roughness: 0.55, metalness: 0.05 },
  metal: { roughness: 0.35, metalness: 0.7 },
  plastic: { roughness: 0.5, metalness: 0 },
  teflon: { roughness: 0.85, metalness: 0 },
  glass: { roughness: 0.1, metalness: 0 },
  rubber: { roughness: 0.9, metalness: 0 },
};

// --- 7 segment rakamlar (kontrolcünün LED ekranı) ---
const SEGS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc",
  "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "", o: "cdeg", P: "abefg", E: "adefg", n: "ceg",
};

function drawDigits(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, on: string, off: string) {
  const w = h * 0.52;
  const t = h * 0.11;
  const gap = w * 0.38;
  let cx = x;
  const chars = text.split("");
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ".") continue;
    const lit = SEGS[ch] ?? "";
    const seg = (name: string, sx: number, sy: number, sw: number, sh: number) => {
      ctx.fillStyle = lit.includes(name) ? on : off;
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
    if (chars[i + 1] === ".") {
      ctx.fillStyle = on;
      ctx.fillRect(cx + w + gap * 0.25, y + h - t, t, t);
    }
    cx += w + gap;
  }
}

// Ekranın düzeni (0..1, kontrolcü yüzünün kendi koordinatında). Tuş konumları
// hem çizimde hem HTML düğmelerinin izdüşümünde kullanılır.
const KEYS = { set: [0.62, 0.8], down: [0.75, 0.8], up: [0.88, 0.8] } as const;

function drawController(tex: CanvasTexture, s: ViewerState, blinkOff: boolean) {
  const c = tex.image as HTMLCanvasElement;
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, W, H);
  // ön çerçeve ve ekran camı
  ctx.fillStyle = "#06070a";
  ctx.fillRect(W * 0.04, H * 0.08, W * 0.5, H * 0.84);
  const offSeg = "#1b1d24";
  const on = s.on;
  drawDigits(ctx, on ? s.pv.padStart(4, " ") : "----", W * 0.07, H * 0.14, H * 0.38, on ? "#ff4b3e" : offSeg, offSeg);
  if (!(s.svBlink && blinkOff)) {
    drawDigits(ctx, on ? s.sv.padStart(4, " ") : "    ", W * 0.13, H * 0.6, H * 0.25, on ? "#7cf27a" : offSeg, offSeg);
  }
  ctx.font = `600 ${H * 0.085}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "#6b7286";
  ctx.fillText("PV", W * 0.47, H * 0.24);
  ctx.fillText("SV", W * 0.47, H * 0.68);
  // OUT / ALM ışıkları
  const lamp = (label: string, x: number, lit: boolean, color: string) => {
    ctx.fillStyle = lit ? color : "#262932";
    ctx.fillRect(x, H * 0.18, W * 0.05, H * 0.07);
    ctx.fillStyle = "#8c93a5";
    ctx.fillText(label, x - W * 0.005, H * 0.38);
  };
  lamp("OUT", W * 0.62, on && s.out, "#ffb43e");
  lamp("ALM", W * 0.78, on && s.alm, "#ff4b3e");
  // membran tuşlar
  ctx.font = `700 ${H * 0.1}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [k, [u, v]] of Object.entries(KEYS)) {
    ctx.fillStyle = "#2b2f3a";
    ctx.fillRect(W * (u - 0.055), H * (v - 0.12), W * 0.11, H * 0.24);
    ctx.fillStyle = "#c5cad6";
    ctx.fillText(k === "set" ? "SET" : k === "up" ? "▲" : "▼", W * u, H * v);
  }
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  tex.needsUpdate = true;
}

function drawSection(tex: CanvasTexture, wrinkle: number, tooHot: boolean) {
  const c = tex.image as HTMLCanvasElement;
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  const a = H * 0.09 * wrinkle;
  const edge = (y: number, ph: number) => {
    const pts: [number, number][] = [];
    for (let x = W * 0.03; x <= W * 0.97; x += W * 0.02) pts.push([x, y + Math.sin((x + ph) / (W * 0.05)) * a]);
    return pts;
  };
  const top = edge(H * 0.15, 0);
  const bot = edge(H * 0.85, W * 0.03).reverse();
  ctx.beginPath();
  [...top, ...bot].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = tooHot ? "rgba(238,240,246,0.45)" : "rgba(238,240,246,0.85)";
  ctx.fill();
  ctx.fillStyle = tooHot ? "rgba(162,168,188,0.35)" : "rgba(162,168,188,0.6)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(W * (0.2 + i * 0.3), H / 2, W * (0.09 - wrinkle * 0.015), H * (0.26 - wrinkle * 0.05), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (wrinkle > 0.05) {
    ctx.strokeStyle = `rgba(10,12,22,${0.35 * wrinkle})`;
    ctx.lineWidth = H * 0.03;
    for (const fx of [0.15, 0.35, 0.55, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(W * fx, H * 0.2);
      ctx.lineTo(W * fx + W * 0.03 * wrinkle, H * 0.5);
      ctx.lineTo(W * fx, H * 0.8);
      ctx.stroke();
    }
  }
  tex.needsUpdate = true;
}

// size: izdüşümde vuruş alanının dünya boyutu (m); min: en küçük piksel.
type Hot = { el: HTMLButtonElement | null; world: Vector3; size: number; min: number };

export default function SB9KViewer({
  config,
  state,
  labels,
  onPower,
  onLight,
  onSet,
  onUp,
  onDown,
  onReady,
  onError,
}: {
  config: Model3dConfig;
  state: ViewerState;
  labels: ViewerLabels;
  onPower: () => void;
  onLight: () => void;
  onSet: () => void;
  onUp: () => void;
  onDown: () => void;
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
  const stateRef = useRef(state);
  const apply = useRef<((s: ViewerState) => void) | null>(null);
  useEffect(() => {
    stateRef.current = state;
    apply.current?.(state);
  }, [state]);

  useEffect(() => {
    const container = canvasHost.current;
    const box = host.current;
    if (!container || !box) return;
    let disposed = false;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      onError?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    const key = new DirectionalLight(0xffffff, 1.1);
    key.position.set(-0.6, 1.2, 0.9);
    scene.add(key);

    const camera = new PerspectiveCamera(24, 1, 0.05, 20);
    const root = new Group();
    scene.add(root);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let yaw = -0.62;
    let pitch = 0.6;
    let dist = 1.4;
    let explodeT = stateRef.current.exploded || stateRef.current.activeLayer ? 1 : 0;
    let explodeTarget = explodeT;
    let dirty = true;
    let visible = true;
    let raf = 0;

    const hots: Record<string, Hot> = {};
    const parts: { obj: Object3D; base: Vector3; cfg?: Model3dPart; mats: MeshStandardMaterial[]; edges: LineBasicMaterial[] }[] = [];
    let water: Mesh | null = null;
    let waterMat: MeshStandardMaterial | null = null;
    let section: Mesh | null = null;
    let sectionTex: CanvasTexture | null = null;
    let ctrlTex: CanvasTexture | null = null;
    let anchors: Anchors | null = null;
    let lastSection = "";
    let lightButton: Object3D | null = null;
    let blinkOff = false;
    let blinkTimer = 0;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
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
      const d = dist * (1 + 0.55 * explodeT);
      const target = new Vector3(0, 0.045 * explodeT, 0);
      camera.position.set(
        target.x + d * Math.cos(pitch) * Math.sin(yaw),
        target.y + d * Math.sin(pitch),
        target.z + d * Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(target);
    };

    const project = () => {
      const rect = container.getBoundingClientRect();
      const camDir = new Vector3();
      camera.getWorldDirection(camDir);
      const n = anchors ? new Vector3(...anchors.slantNormal) : new Vector3(0, 0, 1);
      const facing = n.dot(camDir) < -0.05;
      for (const h of Object.values(hots)) {
        if (!h.el) continue;
        const p = h.world.clone().add(root.position).project(camera);
        const q = h.world.clone().add(root.position).add(new Vector3(h.size, 0, 0)).project(camera);
        const x = ((p.x + 1) / 2) * rect.width;
        const y = ((1 - p.y) / 2) * rect.height;
        const px = Math.max(h.min, Math.abs((q.x - p.x) / 2) * rect.width * 1.2);
        const show = facing && explodeT < 0.05;
        h.el.style.transform = `translate(${x - px / 2}px, ${y - px / 2}px)`;
        h.el.style.width = `${px}px`;
        h.el.style.height = `${px}px`;
        h.el.style.visibility = show ? "visible" : "hidden";
      }
    };

    const applyState = (s: ViewerState) => {
      explodeTarget = s.exploded || s.activeLayer ? 1 : 0;
      if (reduce) explodeT = explodeTarget;
      const lightOn = s.on && s.light;
      for (const p of parts) {
        const dim = s.activeLayer && p.cfg?.layer !== s.activeLayer;
        for (const m of p.mats) {
          const glass = p.cfg?.finish === "glass";
          m.transparent = Boolean(dim) || glass;
          m.opacity = dim ? 0.12 : glass ? 0.7 : 1;
          m.depthWrite = !dim;
          const role = p.cfg?.role;
          if (role === "ledGlass") {
            m.emissive.set(lightOn ? "#cfdcff" : "#000000");
            m.emissiveIntensity = lightOn ? 1.6 : 0;
          } else if (role === "heater") {
            m.emissive.set("#ff5a1f");
            m.emissiveIntensity = s.heat * 0.9;
          } else if (role === "button") {
            // Soldaki düğme güç, sağdaki LED aydınlatma (yükte belirlenir).
            const isLight = p.obj === lightButton;
            m.emissive.set(isLight ? "#eef0f6" : "#d7f89a");
            m.emissiveIntensity = (isLight ? lightOn : s.on) ? 0.75 : 0;
          }
          m.needsUpdate = true;
        }
        for (const e of p.edges) e.opacity = dim ? 0.05 : 0.45;
      }
      if (water && waterMat && anchors) {
        water.position.y = (s.waterLow ? anchors.water.levelLow : anchors.water.levelFull) - (anchors.bbox[0][1] + anchors.bbox[1][1]) / 2;
        waterMat.emissive.set(lightOn ? "#3e52e0" : "#0a0c16");
        waterMat.emissiveIntensity = lightOn ? 0.18 : 0.05;
        waterMat.opacity = s.activeLayer && s.activeLayer !== "mekanik" ? 0.1 : 0.5;
      }
      if (section && sectionTex) {
        const k = `${Math.round(s.wrinkle * 20)}-${s.tooHot}`;
        if (k !== lastSection) {
          lastSection = k;
          drawSection(sectionTex, Math.round(s.wrinkle * 20) / 20, s.tooHot);
        }
        section.visible = !s.waterLow && explodeT < 0.05;
        if (water) section.position.y = water.position.y + 0.0006;
      }
      if (ctrlTex) drawController(ctrlTex, s, blinkOff);
      dirty = true;
    };
    apply.current = applyState;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const now = performance.now();
      if (stateRef.current.svBlink && now - blinkTimer > 350) {
        blinkTimer = now;
        blinkOff = !blinkOff;
        if (ctrlTex) drawController(ctrlTex, stateRef.current, blinkOff);
        dirty = true;
      }
      if (Math.abs(explodeT - explodeTarget) > 0.001) {
        explodeT += (explodeTarget - explodeT) * 0.12;
        if (Math.abs(explodeT - explodeTarget) < 0.002) explodeT = explodeTarget;
        for (const p of parts) {
          const off = p.cfg?.explode;
          if (off) p.obj.position.set(p.base.x + off[0] * explodeT, p.base.y + off[1] * explodeT, p.base.z + off[2] * explodeT);
        }
        if (section) section.visible = !stateRef.current.waterLow && explodeT < 0.05;
        if (water) water.visible = explodeT < 0.5;
        dirty = true;
      }
      if (!dirty) return;
      dirty = false;
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

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    Promise.all([loader.loadAsync(config.src), fetch(config.anchors).then((r) => r.json() as Promise<Anchors>)])
      .then(([gltf, a]) => {
        if (disposed) return;
        anchors = a;
        const center = new Vector3(
          (a.bbox[0][0] + a.bbox[1][0]) / 2,
          (a.bbox[0][1] + a.bbox[1][1]) / 2,
          (a.bbox[0][2] + a.bbox[1][2]) / 2
        );
        root.position.copy(center).negate();
        const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
        dist = (size.length() / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 0.9;
        root.add(gltf.scene);

        // Parçalar: en üstteki adlandırılmış düğümler
        for (const node of [...gltf.scene.children]) {
          const name = String(node.userData?.part ?? node.name);
          const cfg = config.parts.find((p) => name.includes(p.match));
          const mats: MeshStandardMaterial[] = [];
          const edges: LineBasicMaterial[] = [];
          const fin = FINISH[cfg?.finish ?? "paint"];
          const color = new Color(cfg?.color ?? "#c9ced5");
          const dark = color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.25;
          node.traverse((o) => {
            const mesh = o as Mesh;
            if (!mesh.isMesh) return;
            const mat = new MeshStandardMaterial({ color, roughness: fin.roughness, metalness: fin.metalness, side: DoubleSide });
            mesh.material = mat;
            mats.push(mat);
            const em = new LineBasicMaterial({ color: dark ? "#4a4f5c" : "#1b1e27", transparent: true, opacity: 0.45 });
            const line = new LineSegments(new EdgesGeometry(mesh.geometry, 32), em);
            line.renderOrder = 1;
            mesh.add(line);
            edges.push(em);
          });
          parts.push({ obj: node, base: node.position.clone(), cfg, mats, edges });
        }

        const buttons = parts.filter((p) => p.cfg?.role === "button").sort((p, q) => p.base.x - q.base.x);
        lightButton = buttons[1]?.obj ?? null;

        const up = new Vector3(...a.slantNormal);
        const tilt = -Math.atan2(up.y, up.z);
        // Kontrolcü yüzü: 7 segment ekran ve tuşlar (77 × 35 mm)
        const cvs = document.createElement("canvas");
        cvs.width = 770;
        cvs.height = 350;
        ctrlTex = new CanvasTexture(cvs);
        ctrlTex.colorSpace = SRGBColorSpace;
        ctrlTex.anisotropy = 4;
        const face = new Mesh(
          new PlaneGeometry(a.controller.width * 0.98, a.controller.height * 0.96),
          new MeshStandardMaterial({ map: ctrlTex, roughness: 0.35, metalness: 0, emissive: "#ffffff", emissiveMap: ctrlTex, emissiveIntensity: 0.55 })
        );
        face.position.set(...a.controller.center).addScaledVector(up, 0.0006);
        face.rotation.x = tilt;
        root.add(face);
        face.updateMatrixWorld();
        const keyWorld = (u: number, v: number) =>
          new Vector3((u - 0.5) * a.controller.width, (0.5 - v) * a.controller.height, 0.002).applyMatrix4(face.matrix);
        // Tuşlar 10 mm aralıklı: vuruş alanı aralıktan büyük olursa komşu tuşa taşar.
        const keySize = a.controller.width * 0.13;
        hots.set = { el: btnSet.current, world: keyWorld(...KEYS.set), size: keySize, min: 8 };
        hots.down = { el: btnDown.current, world: keyWorld(...KEYS.down), size: keySize, min: 8 };
        hots.up = { el: btnUp.current, world: keyWorld(...KEYS.up), size: keySize, min: 8 };
        const [b0, b1] = a.buttons;
        if (b0) hots.power = { el: btnPower.current, world: new Vector3(...b0.center), size: b0.width, min: 28 };
        if (b1) hots.light = { el: btnLight.current, world: new Vector3(...b1.center), size: b1.width, min: 28 };

        // Logo (çizimde yok; panelin boş sol kısmına)
        new TextureLoader().load("/brand/logo-full.png", (tex) => {
          if (disposed) return;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = 8;
          const img = tex.image as HTMLImageElement;
          const w = a.logo.width;
          const h = (w * img.height) / img.width;
          const logo = new Mesh(new PlaneGeometry(w, h), new MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
          logo.position.set(...a.logo.center).addScaledVector(up, 0.0004);
          logo.rotation.x = tilt;
          root.add(logo);
          dirty = true;
        });

        // Su ve yüzen kesit
        const wx = a.water.max[0] - a.water.min[0];
        const wz = a.water.max[2] - a.water.min[2];
        waterMat = new MeshStandardMaterial({ color: "#121a3a", transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.2 });
        water = new Mesh(new PlaneGeometry(wx, wz), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set((a.water.min[0] + a.water.max[0]) / 2, a.water.levelFull, (a.water.min[2] + a.water.max[2]) / 2);
        water.position.y -= center.y;
        water.position.x -= center.x;
        water.position.z -= center.z;
        scene.add(water);
        const scv = document.createElement("canvas");
        scv.width = 512;
        scv.height = 160;
        sectionTex = new CanvasTexture(scv);
        sectionTex.colorSpace = SRGBColorSpace;
        section = new Mesh(new PlaneGeometry(0.075, 0.0234), new MeshStandardMaterial({ map: sectionTex, transparent: true, roughness: 0.6 }));
        section.rotation.x = -Math.PI / 2;
        section.position.set(water.position.x, water.position.y + 0.0006, water.position.z + wz * 0.08);
        scene.add(section);

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
          new PlaneGeometry((a.bbox[1][0] - a.bbox[0][0]) * 1.5, (a.bbox[1][2] - a.bbox[0][2]) * 1.35),
          new MeshStandardMaterial({ map: new CanvasTexture(sh), transparent: true, depthWrite: false, roughness: 1 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = a.bbox[0][1] - center.y - 0.0015;
        scene.add(shadow);

        resize();
        applyState(stateRef.current);
        for (const p of parts) {
          const off = p.cfg?.explode;
          if (off) p.obj.position.set(p.base.x + off[0] * explodeT, p.base.y + off[1] * explodeT, p.base.z + off[2] * explodeT);
        }
        dirty = true;
        onReady?.();
      })
      .catch(() => {
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
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          x.map?.dispose();
          x.dispose();
        });
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Kurulum bir kez; durum değişiklikleri apply ile gelir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.src]);

  const hot = "absolute left-0 top-0 z-10 cursor-pointer rounded-none bg-transparent outline-none focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <div ref={host} className="absolute inset-0 cursor-grab" role="group" aria-label={labels.model}>
      <div ref={canvasHost} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
      <button ref={btnPower} type="button" className={hot} aria-label={labels.power} aria-pressed={state.on} onClick={onPower} style={{ visibility: "hidden" }} />
      <button ref={btnLight} type="button" className={hot} aria-label={labels.light} aria-pressed={state.on && state.light} onClick={onLight} style={{ visibility: "hidden" }} />
      <button ref={btnSet} type="button" className={hot} aria-label={labels.set} onClick={onSet} style={{ visibility: "hidden" }} />
      <button ref={btnDown} type="button" className={hot} aria-label={labels.down} onClick={onDown} style={{ visibility: "hidden" }} />
      <button ref={btnUp} type="button" className={hot} aria-label={labels.up} onClick={onUp} style={{ visibility: "hidden" }} />
    </div>
  );
}
