import { routing, type AppLocale } from "./routing";

/**
 * Locale önekli bağlantı: localeHref("tr", "/kvkk") → "/tr/kvkk",
 * localeHref("en", "/#urunler") → "/en#urunler". İstemci bileşenleri
 * next-intl'e bağımlı olmasın diye düz next/link ile kullanılır.
 */
export function localeHref(locale: AppLocale, path: string): string {
  if (path === "/" || path === "") return `/${locale}`;
  if (path.startsWith("/#") || path.startsWith("/?")) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}

/** /tr/urunler/x → /en/urunler/x */
export function swapLocale(pathname: string, to: AppLocale): string {
  const pattern = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
  return pattern.test(pathname) ? pathname.replace(pattern, `/${to}`) : `/${to}${pathname}`;
}
