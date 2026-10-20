import { Unbounded, Onest, JetBrains_Mono } from "next/font/google";

// latin-ext zorunlu: Türkçe ğ ş ı İ ç ö ü glifleri oradan geliyor.
// Unbounded: başlıklar — köşeleri yuvarlatılmış kare formlar, logodaki
// wordmark ve meander'ın dik açılı diliyle akraba.
export const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  variable: "--font-unbounded",
  display: "swap",
});

// Onest: gövde metni, butonlar, form.
export const onest = Onest({
  subsets: ["latin", "latin-ext"],
  variable: "--font-onest",
  display: "swap",
});

// JetBrains Mono: yalnız gerçek kod bloklarında (gömülü yazılım paneli).
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const fontVariables = `${unbounded.variable} ${onest.variable} ${jetbrainsMono.variable}`;
