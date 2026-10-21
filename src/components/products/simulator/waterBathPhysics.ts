/**
 * SB-9K doku yüzdürme su banyosunun çalışma prensibi, sadeleştirilmiş fizik
 * modeliyle:
 *
 *   C · dT/dt = P_ısıtıcı · duty − k · (T − T_ortam)
 *
 * C: suyun ısı kapasitesi (≈ 4186 J/K her litre için), k: açık haznenin ısı
 * kaybı. Kontrolcü (ön paneldeki PV/SV ekranı) ayar ile *sensörün okuduğu*
 * sıcaklık arasındaki farka göre ısıtıcı gücünü (duty, 0..1) belirler; sensör
 * hazne tabanında olduğu için suyun ortalamasını gecikmeyle görür.
 *
 * Güvenlik (kullanım kılavuzu §2.2.2): rezistansın gövde sıcaklığı ayrıca
 * izlenir. Su azsa ısı suya geçemez, rezistans hızla ısınır; 150 °C'de ikincil
 * (mekanik) termostat elektriği keser ve rezistans soğuyana kadar ısıtma geri
 * gelmez. Kontrolcü bunu bilmez: ekranda ısıtma komutu (OUT) yanmaya devam eder.
 *
 * TODO(mock-data): sayısal parametreler temsili (content/products/su-banyosu.json),
 * ürünün ölçülmüş değerleri değil.
 */

export type WaterBathParams = {
  volumeL: number;
  heaterW: number;
  ambientC: number;
  lossWK: number;
  minC: number;
  maxC: number;
  startC: number;
  initialSetC: number;
  timeScale: number;
  /** Sensör zaman sabiti (s). */
  sensorTauS: number;
  /** İkincil termostatın kesme ve yeniden bağlama sıcaklıkları (°C). */
  cutoffC: number;
  resetC: number;
};

export type Sample = { T: number; set: number };

export type WaterBathState = {
  /** Suyun gerçek (ortalama) sıcaklığı. */
  T: number;
  /** Sensörün okuduğu sıcaklık: kontrolcü ve ekran (PV) bunu görür. */
  Ts: number;
  /** Rezistans gövde sıcaklığı (ikincil termostat bunu izler). */
  Th: number;
  setC: number;
  /** Kontrolcünün istediği güç (OUT). */
  duty: number;
  /** Rezistansa gerçekten giden güç (termostat kestiyse 0). */
  power: number;
  integral: number;
  on: boolean;
  light: boolean;
  waterLow: boolean;
  cutoff: boolean;
  /** Son örnekten bu yana geçen simülasyon süresi (s). */
  sinceSample: number;
  history: Sample[];
};

export type Status = "off" | "heating" | "holding" | "cooling" | "interlock";

/** Su yüzeyindeki parafin kesitinin durumu (temsili; bkz. sectionOf). */
export type SectionState = "wrinkled" | "opening" | "flat" | "tooHot";

export const SAMPLE_EVERY_S = 10;
export const HISTORY_S = 40 * 60;
const HISTORY_LEN = HISTORY_S / SAMPLE_EVERY_S;

const KP = 0.35; // 1/K: 3 K fark ≈ tam güç
const KI = 0.0009; // 1/(K·s)

export function readParams(raw: Record<string, number>): WaterBathParams {
  const get = (key: keyof WaterBathParams, fallback: number) => (typeof raw[key] === "number" ? raw[key] : fallback);
  return {
    volumeL: get("volumeL", 2),
    heaterW: get("heaterW", 200),
    ambientC: get("ambientC", 22),
    lossWK: get("lossWK", 1.6),
    minC: get("minC", 25),
    maxC: get("maxC", 65),
    startC: get("startC", 22),
    initialSetC: get("initialSetC", 40),
    timeScale: get("timeScale", 90),
    sensorTauS: get("sensorTauS", 45),
    cutoffC: get("cutoffC", 150),
    resetC: get("resetC", 110),
  };
}

export function createState(p: WaterBathParams): WaterBathState {
  return {
    T: p.startC,
    Ts: p.startC,
    Th: p.startC,
    setC: p.initialSetC,
    duty: 0,
    power: 0,
    integral: 0,
    on: false,
    light: true,
    waterLow: false,
    cutoff: false,
    sinceSample: 0,
    history: Array.from({ length: HISTORY_LEN }, () => ({ T: p.startC, set: p.initialSetC })),
  };
}

/** Durumu simülasyon süresi kadar ilerletir (yerinde değiştirir). */
export function advance(s: WaterBathState, p: WaterBathParams, simSeconds: number) {
  const C = p.volumeL * 4186;
  let remaining = simSeconds;
  while (remaining > 0) {
    const dt = Math.min(1, remaining);
    remaining -= dt;

    if (!s.on) {
      s.duty = 0;
      s.integral = 0;
    } else {
      const e = s.setC - s.Ts;
      const p0 = KP * e;
      const unclamped = p0 + s.integral + KI * e * dt;
      // Anti-windup: çıkış doymuşsa integral büyümez.
      if (unclamped > 0 && unclamped < 1) s.integral += KI * e * dt;
      s.duty = Math.min(1, Math.max(0, p0 + s.integral));
    }

    // İkincil termostat kontrolcüden bağımsız: keserse rezistansa güç gitmez.
    if (s.cutoff && s.Th <= p.resetC) s.cutoff = false;
    if (!s.cutoff && s.Th >= p.cutoffC) s.cutoff = true;
    s.power = s.cutoff ? 0 : s.duty;

    // Rezistans: su yeterliyse suyun birkaç derece üstünde kalır; su azsa
    // ısı suya geçemez ve tam güçte yüzlerce dereceye tırmanır.
    const rise = s.waterLow ? 240 : 10;
    const tauH = s.waterLow ? 25 : 40;
    s.Th += ((s.T + s.power * rise - s.Th) / tauH) * dt;

    // Su azsa ısının ancak küçük bir kısmı suya geçer.
    const transfer = s.waterLow ? 0.2 : 1;
    s.T += ((p.heaterW * s.power * transfer - p.lossWK * (s.T - p.ambientC)) / C) * dt;
    s.Ts += ((s.T - s.Ts) / p.sensorTauS) * dt;

    s.sinceSample += dt;
    if (s.sinceSample >= SAMPLE_EVERY_S) {
      s.sinceSample -= SAMPLE_EVERY_S;
      s.history.push({ T: s.Ts, set: s.setC });
      if (s.history.length > HISTORY_LEN) s.history.shift();
    }
  }
}

export function statusOf(s: WaterBathState): Status {
  if (!s.on) return "off";
  if (s.cutoff) return "interlock";
  const e = s.setC - s.Ts;
  if (Math.abs(e) < 0.4) return "holding";
  return e > 0 ? "heating" : "cooling";
}

/**
 * Parafin kesiti su yüzeyinde (temsili): soğuk suda kırışık kalır, ısındıkça
 * açılır, parafinin erime noktasının ~8–10 °C altında gergin ve düz olur;
 * fazla sıcakta dağılma riski başlar (kılavuz, Ek-1). `wrinkle` 0..1.
 */
export function sectionOf(T: number): { state: SectionState; wrinkle: number } {
  if (T >= 54) return { state: "tooHot", wrinkle: 0 };
  if (T >= 38) return { state: "flat", wrinkle: 0 };
  if (T >= 30) return { state: "opening", wrinkle: (38 - T) / 8 };
  return { state: "wrinkled", wrinkle: 1 };
}
