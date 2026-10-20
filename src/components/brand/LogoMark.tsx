import type { SVGProps } from "react";

/**
 * Logodaki meander işaretinin tek çizgi (monoline) vektör izi.
 * TODO: public/logo.jpg'den elle çıkarıldı; resmi vektör/AI dosyası
 * gelince bu path'ler onunla değiştirilmeli.
 *
 * Her parça ayrı bir <path>: DrawSVG ile sırayla çizilebilsin diye
 * (elmas → iç bacaklar → dış bacaklar).
 */
export const LOGO_PATHS = [
  "M430 150 L618 338 L430 526 L242 338 Z",
  "M362 458 V845 H200 V730 H290 V785",
  "M498 458 V845 H660 V730 H570 V785",
  "M300 396 V640 H170 V520 H230 V565",
  "M560 396 V640 H690 V520 H630 V565",
] as const;

// Orijinal logodaki mavi: koyu kenarlardan açık vurguya.
export const LOGO_BLUES = { deep: "#2f40d0", mid: "#4a5ee6", light: "#93a4f4" } as const;

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
  strokeWidth?: number;
  /**
   * "blue": logonun kendi mavisi (degrade). "current": currentColor.
   * Mavi için sayfada tekil bir gradientId ver.
   */
  tone?: "blue" | "current";
  gradientId?: string;
};

export function LogoMark({
  title,
  strokeWidth = 40,
  tone = "blue",
  gradientId = "logo-blue",
  ...props
}: LogoMarkProps) {
  const stroke = tone === "blue" ? `url(#${gradientId})` : "currentColor";
  return (
    <svg
      viewBox="140 112 580 765"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {tone === "blue" && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="150" y1="130" x2="710" y2="865">
            <stop offset="0" stopColor={LOGO_BLUES.deep} />
            <stop offset="0.42" stopColor={LOGO_BLUES.mid} />
            <stop offset="0.62" stopColor={LOGO_BLUES.light} />
            <stop offset="1" stopColor={LOGO_BLUES.deep} />
          </linearGradient>
        </defs>
      )}
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} data-logo-path="" />
      ))}
    </svg>
  );
}
