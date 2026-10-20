import Image from "next/image";
import type { CSSProperties, ReactNode, Ref } from "react";
import type { ProductLayer } from "@/content/schema";
import s from "./WaterBathModel.module.css";

/**
 * Laboratuvar su banyosunun CSS 3B çizimi.
 * TODO(mock-data): gerçek ürün fotoğrafı/3B modeli değil, oranları temsili
 * bir çizim. 360° fotoğraf kareleri gelince turntable onları kullanır.
 *
 * Parçalar ürünün katmanlarına bağlı (data-layer): mekanik = kapak, tank,
 * gövde; elektronik = ısıtıcı ve kontrol kartı; gomulu = yazılım düzlemi;
 * uygulama = ekran. `active` verilince diğer katmanlar söner.
 */

type Tone = "top" | "front" | "side" | "back" | "bottom";
const STEEL: Record<Tone, string> = {
  top: s.steelTop,
  front: s.steelFront,
  side: s.steelSide,
  back: s.steelBack,
  bottom: s.steelBottom,
};

type FaceName = "front" | "back" | "left" | "right" | "top" | "bottom";

function faceStyle(face: FaceName, w: number, h: number, d: number): CSSProperties {
  const size = (fw: number, fh: number): CSSProperties => ({
    width: `${fw}em`,
    height: `${fh}em`,
    marginLeft: `${-fw / 2}em`,
    marginTop: `${-fh / 2}em`,
  });
  switch (face) {
    case "front":
      return { ...size(w, h), transform: `translateZ(${d / 2}em)` };
    case "back":
      return { ...size(w, h), transform: `rotateY(180deg) translateZ(${d / 2}em)` };
    case "right":
      return { ...size(d, h), transform: `rotateY(90deg) translateZ(${w / 2}em)` };
    case "left":
      return { ...size(d, h), transform: `rotateY(-90deg) translateZ(${w / 2}em)` };
    case "top":
      return { ...size(w, d), transform: `rotateX(90deg) translateZ(${h / 2}em)` };
    case "bottom":
      return { ...size(w, d), transform: `rotateX(-90deg) translateZ(${h / 2}em)` };
  }
}

type SlabProps = {
  w: number;
  h: number;
  d: number;
  classes: Record<FaceName, string>;
  content?: Partial<Record<FaceName, ReactNode>>;
};

function Slab({ w, h, d, classes, content = {} }: SlabProps) {
  const faces: FaceName[] = ["front", "back", "left", "right", "top", "bottom"];
  return (
    <>
      {faces.map((face) => (
        <div key={face} className={`${s.face} ${classes[face]}`} style={faceStyle(face, w, h, d)}>
          {content[face]}
        </div>
      ))}
    </>
  );
}

const steelFaces = (brushed = false): Record<FaceName, string> => {
  const b = brushed ? ` ${s.brushed}` : "";
  return {
    front: STEEL.front + b,
    back: STEEL.back + b,
    left: STEEL.side + b,
    right: STEEL.side + b,
    top: STEEL.top,
    bottom: STEEL.bottom,
  };
};

type PartProps = {
  layer: ProductLayer;
  y0: number;
  y1: number;
  delay: number;
  /** Ek yukarı kaldırma (em), ör. kapak açılınca. */
  lift?: string;
  /** Parçaya tıklanınca (ör. kapağı aç/kapat). */
  onClick?: () => void;
  children: ReactNode;
};

function Part({ layer, y0, y1, delay, lift, onClick, children }: PartProps) {
  return (
    <div
      className={`${s.part} ${onClick ? s.clickable : ""}`}
      data-layer={layer}
      onClick={onClick}
      style={{ "--y0": y0, "--y1": y1, ...(lift ? { "--lift": lift } : {}) } as CSSProperties}
    >
      <div className={s.float} style={{ "--delay": `${delay}s` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

function HeaterCoil() {
  // Isıtıcı rezistans, logodaki meander gibi dik açılarla kıvrılır.
  const d =
    "M14 14 H186 V50 H14 V90 H186 V126 H14";
  return (
    <svg viewBox="0 0 200 140" width="100%" height="100%" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="9" className={s.coil} />
    </svg>
  );
}

function BoardTraces() {
  return (
    <svg viewBox="0 0 170 110" width="100%" height="100%" aria-hidden="true">
      <g fill="none" stroke="#93a4f4" strokeWidth="1.6" opacity="0.85">
        <path d="M14 20 H60 V44 H84" />
        <path d="M14 34 H48 V70 H84" />
        <path d="M120 56 H150 V20" />
        <path d="M120 66 H140 V92 H40 V80" />
        <path d="M100 30 V12 H160" />
        <path d="M84 84 H20 V98" />
      </g>
      <rect x="84" y="36" width="36" height="36" fill="#0a0c16" />
      <rect x="20" y="72" width="22" height="12" fill="#0a0c16" />
      <rect x="132" y="70" width="18" height="10" fill="#0a0c16" />
      <g fill="#d9c27a">
        <rect x="8" y="16" width="8" height="8" />
        <rect x="8" y="30" width="8" height="8" />
        <rect x="146" y="14" width="8" height="8" />
        <rect x="16" y="96" width="8" height="8" />
      </g>
    </svg>
  );
}

function FirmwarePlane() {
  const lines = [
    "void control_tick(void) {",
    "  float t = read_probe();",
    "  if (!level_ok()) heater_off();",
    "  duty = pid_step(&pid, set, t);",
    "  pwm_write(HEATER, duty);",
    "}",
  ];
  return (
    <svg viewBox="0 0 150 90" width="100%" height="100%" aria-hidden="true">
      <rect x="1" y="1" width="148" height="88" fill="rgb(215 248 154 / 0.1)" stroke="#d7f89a" strokeWidth="1.2" />
      <g fontFamily="var(--font-mono), monospace" fontSize="8.4" fontWeight="600" fill="#d7f89a">
        {lines.map((line, i) => (
          <text key={line} x="8" y={16 + i * 12} xmlSpace="preserve">
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

type WaterBathModelProps = {
  className?: string;
  style?: CSSProperties;
  active?: ProductLayer | null;
  label: string;
  ref?: Ref<HTMLDivElement>;
  /** Modelle aynı em koordinatında, merkezden konumlanan 2B katman (etiketler). */
  overlay?: ReactNode;
  /** Ön paneldeki ekranın içeriği (simülatör canlı değer gösterir). */
  display?: ReactNode;
  /** Su seviyesi düşükse yüzey ve dalga değişir. */
  waterLow?: boolean;
  /** Sirkülasyon pompası çalışıyorsa su yüzeyinde akış görünür. */
  pumpOn?: boolean;
  /**
   * Ön panelin sağındaki tuş alanı (simülatörde gerçek düğmeler). Verilirse
   * model bir resim değil, kontrol içeren bir grup olur.
   */
  panel?: ReactNode;
  /** Kapağa tıklanınca. */
  onLidClick?: () => void;
};

export function WaterBathModel({
  className,
  style,
  active,
  label,
  ref,
  overlay,
  display,
  waterLow,
  pumpOn,
  panel,
  onLidClick,
}: WaterBathModelProps) {
  // Ölçüler (em). y0 = birleşik, y1 = ayrılmış konum.
  const base = { w: 26, h: 6, d: 18 };
  const tank = { w: 24, h: 9, d: 16 };
  const lid = { w: 25, h: 1.2, d: 17 };
  const pcb = { w: 16, h: 0.6, d: 10.5 };

  return (
    <div
      ref={ref}
      className={`${s.scene} ${className ?? ""}`}
      style={style}
      data-active={active ?? undefined}
      data-water={waterLow ? "low" : undefined}
      data-pump={pumpOn ? "on" : undefined}
      role={panel ? "group" : "img"}
      aria-label={label}
    >
      <div className={s.stage}>
        <div className={s.rig}>
          {/* Kapak */}
          <Part layer="mekanik" y0={-5.2} y1={-19} delay={0} lift="calc(var(--lid, 0) * 5.5)" onClick={onLidClick}>
            <Slab {...lid} classes={steelFaces()} />
            <div style={{ transform: "translateY(-1.1em)", transformStyle: "preserve-3d" }}>
              <Slab
                w={9}
                h={0.9}
                d={1.4}
                classes={{
                  front: s.steelSide,
                  back: s.steelBack,
                  left: s.steelBack,
                  right: s.steelBack,
                  top: s.steelFront,
                  bottom: s.steelBottom,
                }}
              />
            </div>
          </Part>

          {/* Tank + su */}
          <Part layer="mekanik" y0={0} y1={-8.5} delay={0.6}>
            <Slab
              {...tank}
              classes={{ ...steelFaces(true), top: s.water }}
              content={{
                top: (
                  <>
                    <span className={s.ripple} style={{ "--delay": "0s" } as CSSProperties} />
                    <span className={s.ripple} style={{ "--delay": "1.5s" } as CSSProperties} />
                    <span className={s.ripple} style={{ "--delay": "3s" } as CSSProperties} />
                  </>
                ),
              }}
            />
          </Part>

          {/* Isıtıcı */}
          <Part layer="elektronik" y0={4} y1={-1.2} delay={1.1}>
            <div
              className={`${s.face} ${s.plane}`}
              style={{
                width: "20em",
                height: "13em",
                marginLeft: "-10em",
                marginTop: "-6.5em",
                transform: "rotateX(90deg)",
              }}
            >
              <HeaterCoil />
            </div>
          </Part>

          {/* Kontrol kartı */}
          <Part layer="elektronik" y0={7.5} y1={4.2} delay={1.6}>
            <Slab
              {...pcb}
              classes={{
                front: s.pcbEdge,
                back: s.pcbEdge,
                left: s.pcbEdge,
                right: s.pcbEdge,
                top: s.pcbTop,
                bottom: s.pcbEdge,
              }}
              content={{ top: <BoardTraces /> }}
            />
          </Part>

          {/* Gömülü yazılım */}
          <Part layer="gomulu" y0={7.5} y1={9} delay={2.1}>
            <div
              className={`${s.face} ${s.plane}`}
              style={{
                width: "15em",
                height: "9em",
                marginLeft: "-7.5em",
                marginTop: "-4.5em",
                transform: "rotateX(90deg)",
              }}
            >
              <FirmwarePlane />
            </div>
          </Part>

          {/* Gövde + ön panel */}
          <Part layer="mekanik" y0={7.5} y1={15.5} delay={2.6}>
            <div className={s.floor} style={{ transform: `rotateX(90deg) translateZ(${-(base.h / 2 + 0.05)}em)` }} aria-hidden="true" />
            <Slab
              {...base}
              classes={steelFaces()}
              content={{
                front: (
                  <>
                    {/* Ön panelde Ahtapot logosu (public/logo.jpg'den, arka planı şeffaf). */}
                    <span className={s.logo} style={{ left: "1.1em", bottom: "0.85em", width: "5.6em", height: "1.62em" }}>
                      <Image src="/brand/logo-full.png" alt="" fill sizes="120px" className="object-contain" />
                    </span>
                    {panel ? (
                      <>
                        {/* Isıtma ve pompa göstergeleri, logonun üstünde. */}
                        <span className={s.led} style={{ left: "1.2em", top: "0.9em" }} />
                        <span className={`${s.led} ${s.pumpLed}`} style={{ left: "2.3em", top: "0.9em" }} />
                        <div className={s.panel}>{panel}</div>
                      </>
                    ) : (
                      <>
                        <span className={s.led} style={{ right: "6.35em", top: "0.9em" }} />
                        <span className={s.knob} style={{ right: "2.2em", top: "1.6em", width: "2.8em", height: "2.8em" }} />
                        <span className={s.button} style={{ right: "6.2em", top: "2.1em" }} />
                        <span className={s.button} style={{ right: "6.2em", top: "3.3em" }} />
                      </>
                    )}
                  </>
                ),
              }}
            />
            {/* Ekran ayrı bir yüz: uygulama katmanı vurgulanınca tek başına parlasın. */}
            <div
              className={`${s.face} ${s.display}`}
              data-layer="uygulama"
              style={{
                width: "8em",
                height: "3.6em",
                marginLeft: "-4em",
                marginTop: "-1.8em",
                transform: `translateZ(${base.d / 2 + 0.02}em)`,
              }}
            >
              {display ?? (
                <span className={s.digits}>
                  37.0<span className={s.unit}>°C</span>
                </span>
              )}
            </div>
          </Part>
        </div>
        {overlay ? <div className={s.overlay}>{overlay}</div> : null}
      </div>
    </div>
  );
}

/** Ön panel ekranının içeriği: büyük değer + alt satır; uyarıda yanıp söner. */
export function WaterBathDisplay({ value, unit, sub, alert = false, dim = false }: {
  value: string;
  unit?: string;
  sub?: string;
  alert?: boolean;
  dim?: boolean;
}) {
  return (
    <>
      <span className={`${s.digits} ${alert ? s.blink : ""}`} style={dim ? { opacity: 0.45 } : undefined}>
        {value}
        {unit ? <span className={s.unit}>{unit}</span> : null}
      </span>
      {sub ? <span className={s.subline}>{sub}</span> : null}
    </>
  );
}

/** Açık kapaktan yükselen buhar (modelle aynı em koordinatında, 2B). */
export function WaterBathSteam({ intensity }: { intensity: number }) {
  if (intensity <= 0) return null;
  return (
    <div className={s.steam} style={{ opacity: Math.min(1, intensity) }} aria-hidden="true">
      {[-6, -2.5, 1, 4.5, 7].map((x, i) => (
        <span key={x} style={{ left: `${x}em`, animationDelay: `${i * -0.7}s` } as CSSProperties} />
      ))}
    </div>
  );
}
