export const THEME_COOKIE = "ahtapot-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yıl

export type Theme = "light" | "dark";

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Aydınlık varsayılan (CLAUDE.md: "Tema: aydınlık varsayılan"). Sistem
 * prefers-color-scheme'ine göre otomatik koyu temaya geçmiyoruz — yalnız
 * kullanıcı manuel toggle'ladıysa ve bu tercih cookie'de duruyorsa koyu tema
 * uygulanır. Bu yüzden burada bir media-query fallback'i yok, tek kaynak
 * cookie.
 */
export function resolveTheme(cookieValue: string | undefined | null): Theme {
  return isTheme(cookieValue) ? cookieValue : "light";
}
