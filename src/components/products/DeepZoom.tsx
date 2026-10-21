"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type OpenSeadragonType from "openseadragon";
import type { Product } from "@/content/schema";
import type { InteractionLabels } from "./ProductInteractionView";
import { AnnotationLayer, rectPoints, type Pt, type Shape, type Tool } from "./deepzoom/annotations";
import { Icon } from "@/components/brand/Icon";

const OBJECTIVES = [2, 5, 10, 20, 40] as const;

// Açılıştaki örnek işaretlemeler: bölge (görüntü genişliğine göre normalize
// viewport koordinatı) ve poligon (0..100 yerel koordinat). Temsili; klinik
// bir bölgeyi göstermez.
const DEMO_POLYGONS = [
  { rect: [0.38, 0.34, 0.2, 0.18], pts: [[18, 12], [62, 4], [92, 30], [86, 72], [48, 96], [12, 70], [4, 36]] },
  { rect: [0.62, 0.58, 0.14, 0.12], pts: [[10, 20], [60, 6], [94, 40], [70, 92], [20, 84]] },
] as const;
// Örnek mesafe ölçümü (görüntüye göre normalize).
const DEMO_RULER = [[0.39, 0.545], [0.57, 0.545]] as const;

// Ölçek çubuğu: gerçek µm/px değerinden, 50–130 px arasına düşen en uzun
// yuvarlak uzunluk.
const SCALE_STEPS_UM = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
function scaleBar(mpp: number) {
  if (!mpp) return null;
  const um = [...SCALE_STEPS_UM].reverse().find((s) => s / mpp <= 130) ?? SCALE_STEPS_UM[0];
  return { px: um / mpp, label: um >= 1000 ? `${um / 1000} mm` : `${um} µm` };
}

/** Poligonun ilk noktasına bu kadar ekran pikseli yakın tıklama onu kapatır. */
const CLOSE_PX = 12;

/**
 * Görüntüleme yazılımı için tek etkileşim: gerçek bir whole-slide görüntüde
 * yakınlaşma, işaretleme ve ölçüm. Masaüstünde görünür olunca yüklenir;
 * mobilde önce poster. Sayfa kaydırması kesilmez: tekerlekle yakınlaştırma
 * görüntüye tıklandıktan sonra (ya da Ctrl/⌘ ile) devreye girer, imleç
 * çıkınca bırakılır. Çizim araçlarında tıklama nokta ekler, sürükleme gezer.
 */
export function DeepZoom({ product, labels }: { product: Product; labels: InteractionLabels }) {
  const dz = product.assets.deepzoom;
  const t = labels.viewer;
  const frame = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const navHost = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragonType.Viewer | null>(null);
  const osdLib = useRef<typeof OpenSeadragonType | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [mag, setMag] = useState(0);
  const [mpp, setMpp] = useState(0);
  const [imgZoom, setImgZoom] = useState(0);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [layerEl, setLayerEl] = useState<HTMLDivElement | null>(null);
  const [showAnn, setShowAnn] = useState(true);
  const [tool, setTool] = useState<Tool>("pan");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const nextId = useRef(1);
  const navigatorId = `osd-nav-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Masaüstü: görünüme yaklaşınca kendiliğinden aç. Mobil: butonla.
  useEffect(() => {
    if (!frame.current || !window.matchMedia("(min-width: 768px)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOpen(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(frame.current);
    return () => io.disconnect();
  }, []);

  // Tıklama işleyicisi her render'da güncel durumu görür (OSD olayı bir kez bağlanır).
  const onCanvasClick = useRef<(pos: OpenSeadragonType.Point) => void>(() => {});

  useEffect(() => {
    if (!dz || !open || !host.current) return;
    let cancelled = false;
    let viewer: OpenSeadragonType.Viewer | undefined;
    // Mini haritanın kabı her açılışta yeniden yaratılır: OSD destroy'da onu
    // DOM'dan söker, React'in yönettiği bir elemana bağlanmamalı.
    let navEl: HTMLDivElement | null = null;

    import("openseadragon").then(({ default: OpenSeadragon }) => {
      if (cancelled || !host.current) return;
      osdLib.current = OpenSeadragon;
      if (navHost.current && window.matchMedia("(min-width: 768px)").matches) {
        navEl = document.createElement("div");
        navEl.id = navigatorId;
        navEl.style.cssText = "width:100%;height:100%";
        navHost.current.appendChild(navEl);
      }
      viewer = OpenSeadragon({
        element: host.current,
        tileSources: dz.dziPath,
        showNavigationControl: false,
        // Mini harita (gerçek AhtaPatolog arayüzündeki gibi); masaüstünde.
        showNavigator: !!navEl,
        navigatorId: navEl ? navigatorId : undefined,
        navigatorAutoFade: false,
        navigatorBackground: "#05060b",
        navigatorBorderColor: "transparent",
        navigatorDisplayRegionColor: "#d7f89a",
        animationTime: 0.6,
        blendTime: 0.15,
        homeFillsViewer: true,
        visibilityRatio: 1,
        constrainDuringPan: true,
        maxZoomPixelRatio: 1.2,
        gestureSettingsMouse: { clickToZoom: false, scrollToZoom: false, dblClickToZoom: true },
        gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true, clickToZoom: false, dblClickToZoom: false },
      });
      viewerRef.current = viewer;

      viewer.addHandler("canvas-click", (e) => {
        if (!e.quick) return;
        e.preventDefaultAction = true;
        onCanvasClick.current(e.position as OpenSeadragonType.Point);
      });

      viewer.addHandler("open", () => {
        if (cancelled || !viewer) return;
        setReady(true);
        const vp = viewer.viewport;
        const size = viewer.world.getItemAt(0).getContentSize();
        const W = size.x;
        const H = size.y;
        setImgSize({ w: W, h: H });

        const update = () => {
          const z = vp.viewportToImageZoom(vp.getZoom(true));
          setImgZoom(z);
          setMag(dz.nativeObjective * z);
          setMpp(dz.nativeMpp / z);
        };
        update();
        viewer.addHandler("animation", update);

        // Tüm görüntüyü kaplayan tek işaretleme katmanı (React portal ile dolar).
        const layer = document.createElement("div");
        viewer.addOverlay({ element: layer, location: new OpenSeadragon.Rect(0, 0, 1, H / W) });
        setLayerEl(layer);

        // Örnek işaretlemeler ve bir mesafe ölçümü.
        const demo: Shape[] = DEMO_POLYGONS.map((a, i) => {
          const [x, y, w, h] = a.rect;
          return {
            id: i + 1,
            kind: "polygon",
            pts: a.pts.map(([px, py]) => [(x + (px / 100) * w) * W, (y + (py / 100) * h) * W] as Pt),
          };
        });
        demo.push({ id: demo.length + 1, kind: "ruler", pts: DEMO_RULER.map(([px, py]) => [px * W, py * W] as Pt) });
        nextId.current = demo.length + 1;
        setShapes(demo);

        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          // Açılışta ilk işaretlemeye doğru hafif bir yakınlaşma: canlı olduğu görülsün.
          window.setTimeout(() => {
            if (cancelled || !viewer) return;
            const [x, y, w, h] = DEMO_POLYGONS[0].rect;
            vp.panTo(new OpenSeadragon.Point(x + w / 2, y + h / 2));
            // 5× kutudan dar kalabilir (kenarda siyah şerit); en az kutuyu doldursun.
            vp.zoomTo(Math.max(vp.imageToViewportZoom(5 / dz.nativeObjective), vp.getHomeZoom() * 1.04));
            vp.applyConstraints();
          }, 900);
        }
      });
    });

    return () => {
      cancelled = true;
      viewer?.destroy();
      navEl?.remove();
      viewerRef.current = null;
      setLayerEl(null);
    };
  }, [dz, open, navigatorId]);

  // Tekerlekle yakınlaştırmayı aç/kapa; Lenis o sırada sayfayı kaydırmasın.
  // Çizerken çift tıklama yakınlaştırmasın.
  useEffect(() => {
    const viewer = viewerRef.current;
    // Tip tanımında yok ama OSD seçeneği çalışma anında Viewer üzerinde duruyor.
    if (!viewer) return;
    const g = (viewer as unknown as { gestureSettingsMouse: { scrollToZoom: boolean; dblClickToZoom: boolean } }).gestureSettingsMouse;
    g.scrollToZoom = engaged;
    g.dblClickToZoom = tool === "pan";
  }, [engaged, ready, tool]);

  // Ctrl/⌘ + tekerlek her zaman yakınlaştırır.
  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;
    const onWheel = (e: WheelEvent) => {
      const viewer = viewerRef.current;
      if (!viewer || engaged || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const OSD = osdLib.current;
      if (!OSD) return;
      const point = viewer.viewport.pointFromPixel(new OSD.Point(e.clientX - rect.left, e.clientY - rect.top));
      viewer.viewport.zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, point);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ready, engaged]);

  const addShape = useCallback((kind: Shape["kind"], pts: Pt[]) => {
    const id = nextId.current++;
    setShapes((list) => [...list, { id, kind, pts }]);
    setSelected(id);
    setShowAnn(true);
  }, []);

  const finishPolygon = useCallback(() => {
    if (draft.length >= 3) addShape("polygon", draft);
    setDraft([]);
    setHover(null);
  }, [draft, addShape]);

  // Çizim araçlarında tıklama: nokta ekle / şekli tamamla. Gezinde boşluğa
  // tıklama seçimi kaldırır. Ref her render'dan sonra güncel kapanışla dolar.
  useEffect(() => {
    onCanvasClick.current = (pos) => {
      const viewer = viewerRef.current;
      const OSD = osdLib.current;
      if (!viewer || !OSD) return;
      if (tool === "pan") {
        setSelected(null);
        return;
      }
      const ip = viewer.viewport.viewerElementToImageCoordinates(pos);
      const p: Pt = [ip.x, ip.y];
      if (tool === "polygon") {
        if (draft.length >= 3) {
          const first = viewer.viewport.imageToViewerElementCoordinates(new OSD.Point(draft[0][0], draft[0][1]));
          if (Math.hypot(first.x - pos.x, first.y - pos.y) < CLOSE_PX) {
            finishPolygon();
            return;
          }
        }
        setDraft((d) => [...d, p]);
        return;
      }
      if (draft.length === 0) {
        setDraft([p]);
        return;
      }
      addShape(tool, tool === "rect" ? rectPoints(draft[0], p) : [draft[0], p]);
      setDraft([]);
      setHover(null);
    };
  });

  // Çizerken imleci izle (lastik bant).
  useEffect(() => {
    const el = host.current;
    if (!el || tool === "pan" || draft.length === 0) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const viewer = viewerRef.current;
        const OSD = osdLib.current;
        if (!viewer || !OSD) return;
        const r = el.getBoundingClientRect();
        const ip = viewer.viewport.viewerElementToImageCoordinates(new OSD.Point(e.clientX - r.left, e.clientY - r.top));
        setHover([ip.x, ip.y]);
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
    };
  }, [tool, draft.length]);

  const deleteSelected = useCallback(() => {
    setShapes((list) => list.filter((s) => s.id !== selected));
    setSelected(null);
  }, [selected]);

  // Klavye: Enter poligonu bitirir, Esc çizimi/seçimi bırakır, Delete siler.
  useEffect(() => {
    if (!ready || (draft.length === 0 && selected === null)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && tool === "polygon") finishPolygon();
      else if (e.key === "Escape") {
        setDraft([]);
        setHover(null);
        setSelected(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected !== null && draft.length === 0) {
        const target = e.target as HTMLElement;
        if (target.closest("input, textarea")) return;
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, draft.length, selected, tool, finishPolygon, deleteSelected]);

  const chooseTool = (next: Tool) => {
    setTool(next);
    setDraft([]);
    setHover(null);
    if (next !== "pan") setSelected(null);
  };

  const zoomBy = useCallback((f: number) => viewerRef.current?.viewport.zoomBy(f), []);
  const goHome = useCallback(() => viewerRef.current?.viewport.goHome(), []);
  const setObjective = useCallback(
    (m: number) => {
      const vp = viewerRef.current?.viewport;
      if (!vp || !dz) return;
      vp.zoomTo(vp.imageToViewportZoom(m / dz.nativeObjective));
    },
    [dz]
  );
  const fullscreen = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  if (!dz) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-surface p-6 text-center text-small text-muted">
        TODO: {product.slug} için deepzoom kaynağı eksik.
      </div>
    );
  }

  const nearest = OBJECTIVES.reduce((a, b) => (Math.abs(b - mag) < Math.abs(a - mag) ? b : a), OBJECTIVES[0]);
  const bar = scaleBar(mpp);
  const hint =
    tool === "polygon" ? t.hintPolygon : tool === "rect" ? t.hintRect : tool === "ruler" ? t.hintRuler : engaged ? t.hintPan : t.engage;
  const locale = typeof document !== "undefined" ? document.documentElement.lang || "tr" : "tr";

  return (
    // Dar ekranda daha uzun: araç çubuğu, ipucu ve büyütme düğmeleri sığsın.
    <div ref={frame} className="relative aspect-[4/5] overflow-hidden bg-[#05060b] sm:aspect-[4/3]">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="group absolute inset-0 block h-full w-full text-left">
          <Image
            src={dz.posterPath}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover opacity-85 transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
          />
          <span className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
            <span className="btn btn-primary pointer-events-none">
              <Icon name="expand" className="size-4" strokeWidth={2} />
              {t.open}
            </span>
            <span className="bg-ground/85 px-3 py-2 text-small text-ink">{t.sampleNote}</span>
          </span>
        </button>
      ) : (
        <>
          <div
            ref={host}
            className={`absolute inset-0 ${tool === "pan" ? "" : "cursor-crosshair"}`}
            role="img"
            aria-label={t.sampleNote}
            onPointerDown={() => setEngaged(true)}
            onPointerLeave={() => {
              setEngaged(false);
              setHover(null);
            }}
            {...(engaged ? { "data-lenis-prevent": "" } : {})}
          />

          {layerEl && imgSize
            ? createPortal(
                <AnnotationLayer
                  width={imgSize.w}
                  height={imgSize.h}
                  imgZoom={imgZoom}
                  mpp={dz.nativeMpp}
                  locale={locale}
                  shapes={shapes}
                  draft={draft}
                  hover={hover}
                  tool={tool}
                  draftKind={tool === "pan" ? null : tool}
                  selected={selected}
                  visible={showAnn}
                  onSelect={setSelected}
                />,
                layerEl
              )
            : null}

          {/* Üst: araçlar + ipucu (sol), görünüm (sağ) */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
            <div className="flex flex-col items-start gap-2">
              <div className="pointer-events-auto flex flex-wrap bg-ground/85" role="toolbar" aria-label={t.toolsLabel}>
                <ToolButton label={t.toolPan} onClick={() => chooseTool("pan")} pressed={tool === "pan"} tone="accent">
                  <path d="M3.5 2.5 12 7.2l-3.8 1.2-1.4 3.9z" />
                </ToolButton>
                <ToolButton label={t.toolPolygon} onClick={() => chooseTool("polygon")} pressed={tool === "polygon"} tone="accent">
                  <path d="M3 4.5 9 2.5l4.5 4-1.5 6.5-6 1-3-4z" />
                </ToolButton>
                <ToolButton label={t.toolRect} onClick={() => chooseTool("rect")} pressed={tool === "rect"} tone="accent">
                  <path d="M2.5 4h11v8h-11z" />
                </ToolButton>
                <ToolButton label={t.toolRuler} onClick={() => chooseTool("ruler")} pressed={tool === "ruler"} tone="accent">
                  <path d="M2 11 11 2l3 3-9 9zM5 8l1.5 1.5M7 6l1.5 1.5M9 4l1.5 1.5" />
                </ToolButton>
                <span className="my-2 w-px bg-muted/30" aria-hidden="true" />
                <ToolButton label={t.deleteSelected} onClick={deleteSelected} disabled={selected === null}>
                  <path d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.7 9h5.6l.7-9" />
                </ToolButton>
                <ToolButton
                  label={t.clearAll}
                  onClick={() => {
                    setShapes([]);
                    setSelected(null);
                    setDraft([]);
                  }}
                  disabled={shapes.length === 0}
                >
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                </ToolButton>
              </div>
              <p
                className={`max-w-[34ch] bg-ground/85 px-3 py-2 text-small transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"} ${
                  engaged || tool !== "pan" ? "text-accent" : "text-ink"
                }`}
              >
                {hint}
              </p>
            </div>
            <div className="pointer-events-auto flex bg-ground/85">
              <ToolButton label={t.zoomOut} onClick={() => zoomBy(1 / 1.5)} desktopOnly>
                <path d="M3 8h10" />
              </ToolButton>
              <ToolButton label={t.zoomIn} onClick={() => zoomBy(1.5)} desktopOnly>
                <path d="M3 8h10M8 3v10" />
              </ToolButton>
              <ToolButton label={t.home} onClick={goHome}>
                <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
              </ToolButton>
              <ToolButton label={t.annotations} onClick={() => setShowAnn((v) => !v)} pressed={showAnn} tone="eosin">
                <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" />
                <circle cx="8" cy="8" r="1.8" />
              </ToolButton>
              <ToolButton label={t.fullscreen} onClick={fullscreen} desktopOnly>
                <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10M6 6l4 4M10 6l-4 4" />
              </ToolButton>
            </div>
          </div>

          {/* Mini harita: görünen bölge fosfor yeşili çerçeveyle. */}
          <div
            ref={navHost}
            aria-hidden="true"
            className={`absolute right-3 top-16 hidden size-28 bg-ground/85 p-1 transition-opacity duration-300 md:block ${ready ? "opacity-100" : "opacity-0"}`}
          />

          {/* Alt: büyütme (objektif) + ölçek */}
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center bg-ground/85" role="group" aria-label={t.objective}>
              {OBJECTIVES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setObjective(m)}
                  aria-pressed={ready && nearest === m}
                  className={`min-w-9 px-2 py-2 text-small font-semibold tabular-nums transition-colors duration-200 sm:min-w-11 sm:px-2.5 ${
                    ready && nearest === m ? "bg-accent text-accent-ink" : "text-ink hover:bg-ink hover:text-ground"
                  }`}
                >
                  {m}×
                </button>
              ))}
            </div>
            <div className="bg-ground/85 px-3 py-2 text-small tabular-nums text-ink" aria-live="off" title={t.measureNote}>
              {ready && bar ? (
                <>
                  <span className="flex items-end gap-2">
                    <span aria-hidden="true" className="block h-2 border-x-2 border-b-2 border-ink" style={{ width: `${bar.px.toFixed(1)}px` }} />
                    <span className="leading-none">{bar.label}</span>
                  </span>
                  <span className="mt-1.5 hidden text-muted sm:block">
                    {mag.toFixed(1)}× · {mpp.toFixed(2)} µm/px
                  </span>
                </>
              ) : (
                " "
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  pressed,
  disabled,
  tone,
  desktopOnly,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  /** Mobilde gizli (parmakla yakınlaştırma var, yer dar). */
  desktopOnly?: boolean;
  /** Basılıyken: araç seçimi fosfor yeşili, işaretleme görünürlüğü eosin. */
  tone?: "accent" | "eosin";
  children: ReactNode;
}) {
  const on = pressed ? (tone === "accent" ? "bg-accent text-accent-ink" : "text-eosin") : "text-ink";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`${desktopOnly ? "hidden sm:grid" : "grid"} size-9 place-items-center transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-35 sm:size-10 ${on} ${
        disabled || (pressed && tone === "accent") ? "" : "hover:bg-ink hover:text-ground"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
