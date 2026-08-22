import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  // Her zaman bir locale prefix'i olsun (/tr, /en) — kök "/" middleware
  // tarafından defaultLocale'e yönlendirilir, kendi başına render edilmez.
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
