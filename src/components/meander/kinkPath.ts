// -----------------------------------------------------------------------------
// TODO: bu dosya bir yer tutucudur. `meander.svg` (gerçek tasarım kaynağı)
// henüz elimizde değil — burada kink/tick modülünün geometrisi logodaki
// anahtar-motifinden elle yaklaşık türetildi (bkz. docs/superpowers/specs/
// 2026-08-22-ahtapot-web-design.md §1). Gerçek path gelince bu dosya
// tamamen değişecek; şu anki koordinatlar tasarım değeri taşımıyor, yalnız
// "kink ≠ tick, aynı sistem farklı ölçek" mimarisini kanıtlıyor.
// -----------------------------------------------------------------------------

/** Sol rail'de bir KATMAN girişini işaretleyen büyük, spiral modül. */
export type RailMarker =
  | { type: "kink"; y: number }
  | { type: "tick"; y: number };

const TRUNK_X = 0;
const KINK_OUT = 44;
const KINK_STEP = 14;
const TICK_OUT = 10;
const TICK_STEP = 6;

/**
 * Tüm rail'i tek bir sürekli path olarak üretir: gövdeden başlar, her
 * marker'da (KATMANLAR'da kink, diğer bölümlerde tick) dışa kırılıp geri
 * döner, sonunda gövdeye devam eder. DrawSVG bu tek path üzerinde çalışır.
 */
export function buildRailPath(height: number, markers: RailMarker[]): string {
  const sorted = [...markers].sort((a, b) => a.y - b.y);
  let d = `M ${TRUNK_X} 0`;

  for (const marker of sorted) {
    d += ` L ${TRUNK_X} ${marker.y}`;
    if (marker.type === "kink") {
      d += ` L ${TRUNK_X + KINK_OUT} ${marker.y}`;
      d += ` L ${TRUNK_X + KINK_OUT} ${marker.y + KINK_STEP}`;
      d += ` L ${TRUNK_X + KINK_OUT - 18} ${marker.y + KINK_STEP}`;
      d += ` L ${TRUNK_X + KINK_OUT - 18} ${marker.y + KINK_STEP * 2}`;
      d += ` L ${TRUNK_X} ${marker.y + KINK_STEP * 2}`;
    } else {
      d += ` L ${TRUNK_X + TICK_OUT} ${marker.y}`;
      d += ` L ${TRUNK_X + TICK_OUT} ${marker.y + TICK_STEP}`;
      d += ` L ${TRUNK_X} ${marker.y + TICK_STEP}`;
    }
  }

  d += ` L ${TRUNK_X} ${height}`;
  return d;
}

/**
 * Ürün kartlarındaki mini layer-strip için tek başına bir kink glyph'i
 * (bkz. spec §4) — rail'deki modülün küçültülmüş, bağımsız hali.
 */
export function buildMiniKinkPath(size: number): string {
  const out = size * 0.7;
  const step = size * 0.33;
  return [
    `M 0 0`,
    `L 0 ${step}`,
    `L ${out} ${step}`,
    `L ${out} ${step * 2}`,
    `L ${out * 0.4} ${step * 2}`,
    `L ${out * 0.4} ${step * 3}`,
    `L 0 ${step * 3}`,
  ].join(" ");
}
