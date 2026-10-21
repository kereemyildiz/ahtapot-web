import Image from "next/image";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode, Ref } from "react";
import type { ProductLayer } from "@/content/schema";
import { holdRepeat } from "@/lib/holdRepeat";
import s from "./WaterBathModel.module.css";

/**
 * SB-9K doku yüzdürme su banyosunun CSS 3B çizimi. Ölçü ve yerleşimler
 * ürünün SolidWorks montajından (Prod V4, SB-09) alındı; 1 em = 12 mm.
 * Gövde 310 × 347 × 91 mm: altta dik bir şerit, üstünde ~49° yatık ön panel
 * (solda logo, ortada iki ışıklı düğme, sağda kontrolcü), üst yüzeyin
 * neredeyse tamamı mat siyah teflon kaplı hazne, arka duvarda LED aydınlatma
 * camı. Hazne altında 150 × 150 mm silikon ısıtıcı; tabanda 12 V güç kaynağı,
 * SSR ve EMI filtresi.
 * TODO(mock-data): renkler ve logo yerleşimi temsili; gerçek ürün fotoğrafı değil.
 *
 * Parçalar ürünün katmanlarına bağlı (data-layer): mekanik = gövde, hazne;
 * elektronik = ısıtıcı, güç kaynağı, SSR, filtre; gomulu = kontrol yazılımı;
 * uygulama = kontrolcü ekranı. `active` verilince diğer katmanlar söner.
 */

// Gövde (em). Orijin gövdenin merkezi; y aşağı, z öne doğru (CSS 3B).
const W = 25.8;
const D = 28.9;
const H = 7.6;
const hw = W / 2;
const hd = D / 2;
const hh = H / 2;
const LIP = 2.5; // ön alttaki dik şerit
const RISE = H - LIP; // eğik panelin yüksekliği
const RUN = 5.9; // eğik panelin derinliği
const SLANT = Math.hypot(RISE, RUN);
const TILT = (Math.atan2(RUN, RISE) * 180) / Math.PI;
// Hazne ağzı ve derinliği
const OX = 11.6;
const OZ0 = -13.8;
const OZ1 = 8.0;
const OW = OX * 2;
const OD = OZ1 - OZ0;
const OCZ = (OZ0 + OZ1) / 2;
const TOP = -hh + 0.5; // hazne kenarı, üst yüzeyin biraz altında
const FLOOR = TOP + 4.9;

type FaceProps = {
  w: number;
  h: number;
  transform: string;
  className: string;
  layer?: ProductLayer;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Merkezden konumlanan tek yüz: genişlik/yükseklik em, dönüşüm açık. */
function Face({ w, h, transform, className, layer, style, children }: FaceProps) {
  return (
    <div
      className={`${s.face} ${className}`}
      data-layer={layer}
      style={{ width: `${w}em`, height: `${h}em`, marginLeft: `${-w / 2}em`, marginTop: `${-h / 2}em`, transform, ...style }}
    >
      {children}
    </div>
  );
}

const at = (x: number, y: number, z: number) => `translate3d(${x}em, ${y}em, ${z}em)`;

/** Kapalı kutu (6 yüz) — iç parçalar için. */
function Box({ x, y, z, w, h, d, tone, label }: { x: number; y: number; z: number; w: number; h: number; d: number; tone: string; label?: string }) {
  return (
    <>
      <Face w={w} h={h} className={`${tone} ${s.boxFront}`} transform={`${at(x, y, z + d / 2)}`}>
        {label ? <span className={s.boxLabel}>{label}</span> : null}
      </Face>
      <Face w={w} h={h} className={`${tone} ${s.boxBack}`} transform={`${at(x, y, z - d / 2)} rotateY(180deg)`} />
      <Face w={d} h={h} className={`${tone} ${s.boxSide}`} transform={`${at(x + w / 2, y, z)} rotateY(90deg)`} />
      <Face w={d} h={h} className={`${tone} ${s.boxSide}`} transform={`${at(x - w / 2, y, z)} rotateY(-90deg)`} />
      <Face w={w} h={d} className={`${tone} ${s.boxTop}`} transform={`${at(x, y - h / 2, z)} rotateX(90deg)`} />
    </>
  );
}

type PartProps = {
  layer: ProductLayer;
  y1: number;
  delay: number;
  children: ReactNode;
};

/** Birleşikte yerinde (y=0), ayrılmış görünümde y1 kadar kayan katman. */
function Part({ layer, y1, delay, children }: PartProps) {
  return (
    <div className={s.part} data-layer={layer} style={{ "--y1": y1 } as CSSProperties}>
      <div className={s.float} style={{ "--delay": `${delay}s` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

function HeaterPad() {
  // Silikon ısıtıcının içindeki direnç teli: logodaki meander gibi dik açılı.
  const d = "M12 12 H138 V38 H12 V64 H138 V90 H12 V116 H138 V138";
  return (
    <svg viewBox="0 0 150 150" width="100%" height="100%" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="6" className={s.coil} />
    </svg>
  );
}

function FirmwarePlane() {
  const lines = [
    "void control_tick(void) {",
    "  float pv = read_probe();",
    "  out = pid_step(&pid, sv, pv);",
    "  ssr_write(out);       // OUT",
    "  alarm(pv > sv + ALM); // ALM",
    "}",
  ];
  return (
    <svg viewBox="0 0 160 90" width="100%" height="100%" aria-hidden="true">
      <rect x="1" y="1" width="158" height="88" fill="rgb(215 248 154 / 0.1)" stroke="#d7f89a" strokeWidth="1.2" />
      <g fontFamily="var(--font-mono), monospace" fontSize="8.2" fontWeight="600" fill="#d7f89a">
        {lines.map((line, i) => (
          <text key={line} x="8" y={16 + i * 12} xmlSpace="preserve">
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

/**
 * Kontrolcünün ön yüzü (ENDA ET2011 kılavuzundaki düzen): tek 4 haneli ekran
 * (ölçülen değer; ayar yapılırken ayar değeri), üstte °F · C/A2 · SSR ışıkları,
 * sağda üstte °C ve ▲, altta SET ve ▼. Ekran boşsa kontrolcü enerjisizdir.
 */
export function ControllerFace({
  display,
  blink = false,
  ssr = false,
  alarm = false,
  keys,
}: {
  display: string;
  blink?: boolean;
  ssr?: boolean;
  alarm?: boolean;
  keys?: { up: ReactNode; set: ReactNode; down: ReactNode };
}) {
  return (
    <div className={s.controller}>
      <div className={s.window}>
        <span className={s.lamps} aria-hidden="true">
          <span className={s.lamp}>°F</span>
          <span className={s.lamp} data-on={alarm ? "" : undefined}>
            C/A2
          </span>
          <span className={s.lamp} data-on={ssr ? "" : undefined}>
            SSR
          </span>
        </span>
        <span className={`${s.readout} ${blink ? s.blink : ""}`}>{display}</span>
      </div>
      <div className={s.keypad}>
        <span className={s.unit} aria-hidden="true">
          °C
        </span>
        {keys?.up ?? <span className={s.key} aria-hidden="true">▲</span>}
        {keys?.set ?? <span className={s.key} aria-hidden="true">SET</span>}
        {keys?.down ?? <span className={s.key} aria-hidden="true">▼</span>}
      </div>
    </div>
  );
}

/** Ön paneldeki ışıklı düğme (gerçek <button>); `on` iken içi yanar. */
export function PushButton({ label, on, tone = "power", onClick }: { label: string; on: boolean; tone?: "power" | "light"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={on}
      onClick={onClick}
      className={`${s.push} ${tone === "light" ? s.pushLight : ""}`}
      data-on={on ? "" : undefined}
    />
  );
}

/** Kontrolcünün membran tuşu (gerçek <button>); `repeat` verilirse basılı tutunca hızlanır. */
export function ControllerKey({
  label,
  children,
  repeat,
  ...rest
}: { label: string; children: ReactNode; repeat?: (size: number) => void } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={s.key} {...rest} {...(repeat ? holdRepeat(repeat) : {})}>
      {children}
    </button>
  );
}

/** Su yüzeyinde yüzen parafin kesiti şeridi (temsili). wrinkle 0..1, tooHot dağılma. */
function SectionRibbon({ wrinkle, tooHot }: { wrinkle: number; tooHot: boolean }) {
  // Üç kesitlik şerit; kırışıklık kenarları dalgalandırır ve iç kat izleri çizer.
  const a = 2.6 * wrinkle;
  const edge = (y: number, phase: number) => {
    const pts: string[] = [];
    for (let x = 8; x <= 152; x += 8) pts.push(`${x} ${(y + Math.sin((x + phase) / 9) * a).toFixed(2)}`);
    return pts;
  };
  // Üst kenar soldan sağa, alt kenar sağdan sola: tek kapalı çevre.
  const outline = `M${[...edge(10, 0), ...edge(40, 5).reverse()].join(" L")} Z`;
  return (
    <svg viewBox="0 0 160 50" width="100%" height="100%" aria-hidden="true" className={tooHot ? s.sectionHot : undefined}>
      <path d={outline} className={s.paraffin} />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={32 + i * 48} cy={25} rx={14 - wrinkle * 2} ry={8 - wrinkle * 2} className={s.tissue} />
      ))}
      {wrinkle > 0.05 &&
        [24, 56, 88, 120].map((x) => (
          <path key={x} d={`M${x} 12 L${x + 6 * wrinkle} 25 L${x} 38`} className={s.fold} style={{ opacity: wrinkle }} />
        ))}
      {[56, 104].map((x) => (
        <path key={x} d={`M${x} 10 V40`} className={s.seam} />
      ))}
    </svg>
  );
}

type WaterBathModelProps = {
  className?: string;
  style?: CSSProperties;
  active?: ProductLayer | null;
  label: string;
  ref?: Ref<HTMLDivElement>;
  /** Modelle aynı em koordinatında, merkezden konumlanan 2B katman. */
  overlay?: ReactNode;
  /** Kontrolcünün yüzü (simülatörde canlı değerler ve gerçek tuşlar). */
  controller?: ReactNode;
  /** Ön paneldeki iki ışıklı düğme (simülatörde gerçek düğmeler). */
  powerButton?: ReactNode;
  lightButton?: ReactNode;
  /** Düğme ışıkları ve LED aydınlatma (düğme verilmeyen statik görünüm için). */
  powerOn?: boolean;
  lightOn?: boolean;
  /** Su seviyesi düşükse yüzey aşağı iner. */
  waterLow?: boolean;
  /** Su yüzeyindeki parafin kesiti (verilmezse çizilmez). */
  section?: { wrinkle: number; tooHot: boolean };
};

export function WaterBathModel({
  className,
  style,
  active,
  label,
  ref,
  overlay,
  controller,
  powerButton,
  lightButton,
  powerOn = true,
  lightOn = true,
  waterLow,
  section,
}: WaterBathModelProps) {
  const interactive = Boolean(controller || powerButton || lightButton);
  const water = waterLow ? FLOOR - 0.75 : TOP + 1.5;
  // Eğik panelin merkezi ve üstündeki yerleşim (panelin kendi koordinatında, em).
  const slantY = hh - LIP - RISE / 2;
  const slantZ = hd - RUN / 2;
  const sideClipR = `polygon(0% ${((hh + hh - LIP) / H) * 100}%, 0% 100%, 100% 100%, 100% 0%, ${(RUN / D) * 100}% 0%)`;
  const sideClipL = `polygon(100% ${((hh + hh - LIP) / H) * 100}%, 100% 100%, 0% 100%, 0% 0%, ${100 - (RUN / D) * 100}% 0%)`;
  const deck = (x: number, z: number, w: number, d: number) => (
    <Face w={w} h={d} className={s.steelTop} transform={`${at(x, -hh, z)} rotateX(90deg)`} />
  );

  return (
    <div
      ref={ref}
      className={`${s.scene} ${className ?? ""}`}
      style={style}
      data-active={active ?? undefined}
      data-light={lightOn && powerOn ? "on" : undefined}
      role={interactive ? "group" : "img"}
      aria-label={label}
    >
      <div className={s.stage}>
        <div className={s.rig}>
          {/* Hazne: mat siyah teflon, su ve arka duvardaki LED camı. */}
          <Part layer="mekanik" y1={-12} delay={0}>
            {/* Dış yüzler (ayrılınca kutu olarak görünsün) */}
            <Face w={OW} h={FLOOR - TOP} className={s.trayOut} transform={`${at(0, (TOP + FLOOR) / 2, OZ1)}`} />
            <Face w={OW} h={FLOOR - TOP} className={s.trayOut} transform={`${at(0, (TOP + FLOOR) / 2, OZ0)} rotateY(180deg)`} />
            <Face w={OD} h={FLOOR - TOP} className={s.trayOutSide} transform={`${at(OX, (TOP + FLOOR) / 2, OCZ)} rotateY(90deg)`} />
            <Face w={OD} h={FLOOR - TOP} className={s.trayOutSide} transform={`${at(-OX, (TOP + FLOOR) / 2, OCZ)} rotateY(-90deg)`} />
            <Face w={OW} h={OD} className={s.trayOutBottom} transform={`${at(0, FLOOR, OCZ)} rotateX(-90deg)`} />
            {/* İç yüzler */}
            <Face w={OW} h={FLOOR - TOP} className={s.teflon} transform={`${at(0, (TOP + FLOOR) / 2, OZ0 + 0.02)}`}>
              <span className={s.ledGlass} />
            </Face>
            <Face w={OW} h={FLOOR - TOP} className={s.teflonDark} transform={`${at(0, (TOP + FLOOR) / 2, OZ1 - 0.02)} rotateY(180deg)`} />
            <Face w={OD} h={FLOOR - TOP} className={s.teflonSide} transform={`${at(-OX + 0.02, (TOP + FLOOR) / 2, OCZ)} rotateY(90deg)`} />
            <Face w={OD} h={FLOOR - TOP} className={s.teflonSide} transform={`${at(OX - 0.02, (TOP + FLOOR) / 2, OCZ)} rotateY(-90deg)`} />
            <Face w={OW} h={OD} className={s.teflonFloor} transform={`${at(0, FLOOR - 0.02, OCZ)} rotateX(90deg)`} />
            <Face w={OW - 0.1} h={OD - 0.1} className={s.water} transform={`${at(0, water, OCZ)} rotateX(90deg)`}>
              <span className={s.ripple} style={{ "--delay": "0s" } as CSSProperties} />
              <span className={s.ripple} style={{ "--delay": "2.2s" } as CSSProperties} />
              {section ? (
                <span className={s.section}>
                  <SectionRibbon wrinkle={section.wrinkle} tooHot={section.tooHot} />
                </span>
              ) : null}
            </Face>
          </Part>

          {/* Isıtıcı: haznenin altında 150 × 150 mm silikon rezistans */}
          <Part layer="elektronik" y1={-6} delay={0.5}>
            <Face w={12.5} h={12.5} className={`${s.heater} ${s.plane}`} transform={`${at(0, FLOOR + 0.25, -1.6)} rotateX(90deg)`}>
              <HeaterPad />
            </Face>
          </Part>

          {/* Tabandaki güç elektroniği */}
          <Part layer="elektronik" y1={-1.5} delay={1}>
            <Box x={-7.6} y={hh - 2.2} z={10.6} w={7.5} h={4.2} d={2.4} tone={s.module} label="12 V" />
            <Box x={7.4} y={hh - 0.8} z={0} w={4.6} h={1.6} d={4.6} tone={s.ssr} label="SSR" />
            <Box x={-6} y={hh - 0.8} z={-9} w={5.2} h={1.6} d={3.6} tone={s.module} label="EMI" />
          </Part>

          {/* Kontrol yazılımı */}
          <Part layer="gomulu" y1={4} delay={1.5}>
            <Face w={13} h={7.4} className={`${s.firmware} ${s.plane}`} transform={`${at(0, hh - 0.4, -2)} rotateX(90deg)`}>
              <FirmwarePlane />
            </Face>
          </Part>

          {/* Gövde, ön panel ve kontroller */}
          <Part layer="mekanik" y1={10} delay={2}>
            <div className={s.floor} style={{ transform: `${at(0, hh + 0.05, 0)} rotateX(90deg)` }} aria-hidden="true" />
            {/* Ön alttaki dik şerit: model adı */}
            <Face w={W} h={LIP} className={s.steelFront} transform={at(0, hh - LIP / 2, hd)}>
              <span className={s.engraving} style={{ right: "1.2em", top: "0.85em" }}>
                SB-9K
              </span>
            </Face>
            {/* Eğik ön panel */}
            <Face w={W} h={SLANT} className={s.steelPanel} transform={`${at(0, slantY, slantZ)} rotateX(${TILT}deg)`}>
              {/* Logo panelin solunda (TODO(mock-data): gerçek yerleşim teyit edilmeli). */}
              <span className={s.logo} style={{ left: "2.2em", top: "2.9em", width: "8.4em", height: "2.45em" }}>
                <Image src="/brand/logo-full.png" alt="" fill sizes="160px" loading="eager" className="object-contain" />
              </span>
              {/* Işıklı düğmeler: güç ve LED aydınlatma (çizimde Ø21 mm) */}
              <span className={s.pushSlot} style={{ left: `${hw + 0.3 - 0.9}em` }}>
                {powerButton ?? <span className={s.push} data-on={powerOn ? "" : undefined} />}
              </span>
              <span className={s.pushSlot} style={{ left: `${hw + 2.8 - 0.9}em` }}>
                {lightButton ?? <span className={`${s.push} ${s.pushLight}`} data-on={lightOn && powerOn ? "" : undefined} />}
              </span>
              {/* Kontrolcü: 77 mm genişlik, panelin sağında */}
              <span className={s.controllerSlot} data-layer="uygulama" style={{ left: `${hw + 4.7}em` }}>
                {controller ?? <ControllerFace display="40.0" ssr />}
              </span>
            </Face>
            {/* Üst yüzey, hazne ağzının çevresi */}
            {deck(0, (-hd + OZ0) / 2, W, OZ0 + hd)}
            {deck(0, (OZ1 + hd - RUN) / 2, W, hd - RUN - OZ1)}
            {deck(-(hw + OX) / 2, OCZ, hw - OX, OD)}
            {deck((hw + OX) / 2, OCZ, hw - OX, OD)}
            {/* Yanlar (önde eğik kesik), arka, alt */}
            <Face w={D} h={H} className={s.steelSide} transform={`rotateY(90deg) translateZ(${hw}em)`} style={{ clipPath: sideClipR }} />
            <Face w={D} h={H} className={s.steelSide} transform={`rotateY(-90deg) translateZ(${hw}em)`} style={{ clipPath: sideClipL }} />
            <Face w={W} h={H} className={s.steelBack} transform={`rotateY(180deg) translateZ(${hd}em)`}>
              {/* Arka panelde güç girişi (IEC) */}
              <span className={s.inlet} style={{ left: "1.75em", top: "4.3em" }} />
            </Face>
            <Face w={W} h={D} className={s.steelBottom} transform={`rotateX(-90deg) translateZ(${hh}em)`} />
          </Part>
        </div>
        {overlay ? <div className={s.overlay}>{overlay}</div> : null}
      </div>
    </div>
  );
}

/** Haznenin üstünde, fazla sıcakta yükselen buhar (modelle aynı em koordinatında, 2B). */
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
