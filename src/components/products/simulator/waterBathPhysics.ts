/**
 * Su banyosunun çalışma prensibi, sadeleştirilmiş fizik modeliyle:
 *
 *   C · dT/dt = P_ısıtıcı · duty − k · (T − T_ortam)
 *
 * C: suyun ısı kapasitesi (≈ 4186 J/K her litre için), k: kayıp katsayısı
 * (kapak açıkken büyür, yüksek sıcaklıkta buharlaşma eklenir). Gömülü
 * yazılımdaki PI kontrolcü ayar ile *sensörün okuduğu* sıcaklık arasındaki
 * farka göre ısıtıcı gücünü (duty, 0..1) belirler. Su seviyesi düşükse
 * güvenlik kilidi ısıtıcıyı keser; bu karar kontrolcüden önce gelir.
 *
 * Sirkülasyon pompası suyu karıştırır: sensör suyun gerçek sıcaklığını
 * çabuk görür. Pompa kapalıyken ısı katmanlaşır, sensör geç algılar ve
 * kontrolcü ayarı aşıp salınır (birinci dereceden sensör gecikmesi).
 *
 * Zamanlayıcı ayar sıcaklığına ulaşılınca saymaya başlar; süre dolunca
 * ısıtma durur.
 *
 * TODO(mock-data): parametreler ve pompa/zamanlayıcı davranışı temsili
 * (content/products/su-banyosu.json), ürünün gerçek değerleri değil.
 */

export type WaterBathParams = {
  volumeL: number;
  heaterW: number;
  ambientC: number;
  lossLidClosedWK: number;
  lossLidOpenWK: number;
  minC: number;
  maxC: number;
  startC: number;
  initialSetC: number;
  timeScale: number;
  /** Sensör zaman sabiti (s): pompa açık / kapalı. */
  sensorTauPumpS: number;
  sensorTauStillS: number;
};

export type Sample = { T: number; set: number };

export type WaterBathState = {
  /** Suyun gerçek (ortalama) sıcaklığı. */
  T: number;
  /** Sensörün okuduğu sıcaklık: kontrolcü ve ekran bunu görür. */
  Ts: number;
  setC: number;
  duty: number;
  integral: number;
  running: boolean;
  lidOpen: boolean;
  waterLow: boolean;
  pumpOn: boolean;
  /** Zamanlayıcı süresi (simülasyon saniyesi); 0 = kapalı. */
  timerS: number;
  timerLeftS: number;
  /** Ayar sıcaklığına ulaşıldı, süre sayılıyor. */
  timerCounting: boolean;
  timerDone: boolean;
  /** Son örnekten bu yana geçen simülasyon süresi (s). */
  sinceSample: number;
  history: Sample[];
};

export type Status = "idle" | "heating" | "holding" | "cooling" | "interlock" | "done";

export const SAMPLE_EVERY_S = 10;
export const HISTORY_S = 40 * 60;
const HISTORY_LEN = HISTORY_S / SAMPLE_EVERY_S;
/** Zamanlayıcının ön paneldeki adımları (dk); 0 = kapalı. */
export const TIMER_STEPS_MIN = [0, 30, 60, 90] as const;

const KP = 0.35; // 1/K: 3 K fark ≈ tam güç
const KI = 0.0009; // 1/(K·s)

export function readParams(raw: Record<string, number>): WaterBathParams {
  const get = (key: keyof WaterBathParams, fallback: number) => (typeof raw[key] === "number" ? raw[key] : fallback);
  return {
    volumeL: get("volumeL", 10),
    heaterW: get("heaterW", 1000),
    ambientC: get("ambientC", 22),
    lossLidClosedWK: get("lossLidClosedWK", 6),
    lossLidOpenWK: get("lossLidOpenWK", 14),
    minC: get("minC", 25),
    maxC: get("maxC", 95),
    startC: get("startC", 22),
    initialSetC: get("initialSetC", 37),
    timeScale: get("timeScale", 90),
    sensorTauPumpS: get("sensorTauPumpS", 15),
    sensorTauStillS: get("sensorTauStillS", 240),
  };
}

export function createState(p: WaterBathParams): WaterBathState {
  return {
    T: p.startC,
    Ts: p.startC,
    setC: p.initialSetC,
    duty: 0,
    integral: 0,
    running: false,
    lidOpen: false,
    waterLow: false,
    pumpOn: true,
    timerS: 0,
    timerLeftS: 0,
    timerCounting: false,
    timerDone: false,
    sinceSample: 0,
    history: Array.from({ length: HISTORY_LEN }, () => ({ T: p.startC, set: p.initialSetC })),
  };
}

function lossCoefficient(s: WaterBathState, p: WaterBathParams) {
  let k = s.lidOpen ? p.lossLidOpenWK : p.lossLidClosedWK;
  // Açık kapakta yüksek sıcaklıkta buharlaşma kaybı hızla artar.
  if (s.lidOpen && s.T > 50) k += 0.3 * (s.T - 50);
  return k;
}

/** Zamanlayıcıyı bir sonraki adıma geçirir (kapalı → 30 → 60 → 90 → kapalı). */
export function cycleTimer(s: WaterBathState) {
  const current = TIMER_STEPS_MIN.indexOf((s.timerS / 60) as (typeof TIMER_STEPS_MIN)[number]);
  const next = TIMER_STEPS_MIN[(current + 1) % TIMER_STEPS_MIN.length];
  s.timerS = next * 60;
  s.timerLeftS = s.timerS;
  s.timerCounting = false;
  s.timerDone = false;
}

/** Durumu simülasyon süresi kadar ilerletir (yerinde değiştirir). */
export function advance(s: WaterBathState, p: WaterBathParams, simSeconds: number) {
  const C = p.volumeL * 4186;
  let remaining = simSeconds;
  while (remaining > 0) {
    const dt = Math.min(1, remaining);
    remaining -= dt;

    // Güvenlik kilidi kontrolcüden önce: su azsa ısıtıcı kapalı.
    if (!s.running || s.waterLow) {
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

    const k = lossCoefficient(s, p);
    s.T += ((p.heaterW * s.duty - k * (s.T - p.ambientC)) / C) * dt;
    const tau = s.pumpOn ? p.sensorTauPumpS : p.sensorTauStillS;
    s.Ts += ((s.T - s.Ts) / tau) * dt;

    // Zamanlayıcı: ayara ulaşınca sayar, dolunca ısıtmayı durdurur.
    if (s.running && s.timerS > 0) {
      if (!s.timerCounting && Math.abs(s.setC - s.Ts) < 0.5) s.timerCounting = true;
      if (s.timerCounting) {
        s.timerLeftS -= dt;
        if (s.timerLeftS <= 0) {
          s.timerLeftS = 0;
          s.timerCounting = false;
          s.timerDone = true;
          s.running = false;
        }
      }
    }

    s.sinceSample += dt;
    if (s.sinceSample >= SAMPLE_EVERY_S) {
      s.sinceSample -= SAMPLE_EVERY_S;
      s.history.push({ T: s.Ts, set: s.setC });
      if (s.history.length > HISTORY_LEN) s.history.shift();
    }
  }
}

export function statusOf(s: WaterBathState, p: WaterBathParams): Status {
  if (s.timerDone) return "done";
  if (s.running && s.waterLow) return "interlock";
  if (!s.running) return s.Ts > p.ambientC + 1 ? "cooling" : "idle";
  const e = s.setC - s.Ts;
  if (Math.abs(e) < 0.4) return "holding";
  return e > 0 ? "heating" : "cooling";
}
