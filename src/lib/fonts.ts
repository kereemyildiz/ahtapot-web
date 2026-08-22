import { Archivo, Manrope, JetBrains_Mono } from "next/font/google";

// Archivo'nun genişlik (wdth) eksenini açıkça istemek gerekiyor — next/font
// bunu otomatik eklemiyor, axes belirtilmezse variable font wght-only iner ve
// hero'daki "expanded" ayarı hiçbir şey yapmaz. Aralık (62–125, default 100)
// node_modules/next/dist/compiled/@next/font/dist/google/font-data.json'dan
// doğrulandı.
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = `${archivo.variable} ${manrope.variable} ${jetbrainsMono.variable}`;
