import type { CSSProperties } from "react";

/**
 * Yalnız mutlak M/L/H/V/Z komutlu çoklu doğruların uzunluğu. Sitedeki
 * darbe/ışın yolları bu biçimde; sunucuda da DOM olmadan hesaplanır.
 */
export function polylineLength(d: string) {
  const tokens = d.match(/[MLHVZ]|-?\d*\.?\d+/gi) ?? [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let len = 0;
  let cmd = "M";
  let i = 0;
  while (i < tokens.length) {
    const tk = tokens[i];
    if (/^[MLHVZ]$/i.test(tk)) {
      cmd = tk.toUpperCase();
      i++;
      if (cmd === "Z") {
        len += Math.hypot(sx - x, sy - y);
        x = sx;
        y = sy;
      }
      continue;
    }
    if (cmd === "M") {
      x = sx = Number(tokens[i]);
      y = sy = Number(tokens[i + 1]);
      i += 2;
      cmd = "L";
    } else if (cmd === "L") {
      const nx = Number(tokens[i]);
      const ny = Number(tokens[i + 1]);
      len += Math.hypot(nx - x, ny - y);
      x = nx;
      y = ny;
      i += 2;
    } else if (cmd === "H") {
      const nx = Number(tokens[i]);
      len += Math.abs(nx - x);
      x = nx;
      i++;
    } else if (cmd === "V") {
      const ny = Number(tokens[i]);
      len += Math.abs(ny - y);
      y = ny;
      i++;
    } else {
      i++;
    }
  }
  return len;
}

/**
 * Yolda akan darbe (.pulse) için çizgi deseni ve --len. pathLength
 * kullanılmaz: Chrome CSS'teki stroke-dashoffset'i pathLength'e göre
 * ölçeklemiyor, darbe yolun yalnız sonunda dolaşıyordu.
 */
export function pulseDash(d: string, dashFraction: number) {
  const len = polylineLength(d);
  const dash = len * dashFraction;
  return {
    strokeDasharray: `${dash.toFixed(1)} ${(len - dash).toFixed(1)}`,
    style: { "--len": len.toFixed(1) } as CSSProperties,
  };
}

/** Kendini çizen yol (.mod-draw) için: tek çizgi + boşluk, --len gerçek uzunluk. */
export function drawDash(d: string) {
  const len = polylineLength(d).toFixed(1);
  return {
    strokeDasharray: `${len} ${len}`,
    style: { "--len": len } as CSSProperties,
  };
}
