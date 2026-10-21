import type { SVGProps } from "react";
import type { LayerId } from "@/content/constants";

/**
 * Sitenin tek ikon seti: 24'lük ızgara, 1.75 çizgi, kare uç ve sivri köşe —
 * logodaki meander'ın dik açılı diliyle aynı. Bağımlılık yok, yalnız
 * kullanılan ikonlar. Hepsi dekoratif (aria-hidden); anlamı yanındaki
 * metin ya da aria-label taşır.
 */
const PATHS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.75 5.6 3.75 9S14.5 18.4 12 21M12 3C9.5 5.6 8.25 8.6 8.25 12S9.5 18.4 12 21" />
    </>
  ),
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 6l-6 6 6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  menu: <path d="M3 7h18M3 12h18M3 17h18" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  phone: (
    <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2" />
  ),
  mail: (
    <>
      <path d="M3 5h18v14H3z" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  check: <path d="M4 12.5 9.5 18 20 6.5" />,
  // Uyarı: durum yalnız renkle verilmesin (su az, kesit kırışık, form hatası).
  alert: <path d="M12 3 22 20H2zM12 9.5v5M12 16.5v1.5" />,
  // Disiplinler (yetkinlik adımları ve ürün katmanları aynı ikonla)
  cube: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  chip: <path d="M7 7h10v10H7zM10 10h4v4h-4zM9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" />,
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  window: <path d="M3 4h18v16H3zM3 8.5h18M7 12.5h10M7 16h6" />,
  map: <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
  // Simülatör
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" />,
  drop: <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />,
  layers: <path d="M12 3 2 8.5l10 5.5 10-5.5zM2 13l10 5.5L22 13M2 17.5 12 23l10-5.5" />,
  thermometer: <path d="M10 4.5a2 2 0 0 1 4 0V14a4 4 0 1 1-4 0zM12 10v7" />,
  expand: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
} as const;

/** Yetkinlik adımı / ürün katmanı → ikon. */
export const LAYER_ICON: Record<LayerId, IconName> = {
  mekanik: "cube",
  elektronik: "chip",
  gomulu: "code",
  uygulama: "window",
  saha: "map",
};

export type IconName = keyof typeof PATHS;

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: IconName };

export function Icon({ name, className = "size-[1.1em]", strokeWidth = 1.75, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
