import { Instrument_Sans, Onest, JetBrains_Mono } from "next/font/google";

// latin-ext zorunlu: Türkçe ğ ş ı İ ç ö ü glifleri oradan geliyor.
// Instrument Sans: başlıklar — dik, sakin bir grotesk; "d", "a", "g" gibi
// harflerde kıvrım/eğiklik yok, bu yüzden büyük boyda da kurumsal durur.
// Unbounded kullanıcı isteğiyle bırakıldı (geniş, yuvarlak formlar fazla oyuncaktı).
export const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument-sans",
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

export const fontVariables = `${instrumentSans.variable} ${onest.variable} ${jetbrainsMono.variable}`;
