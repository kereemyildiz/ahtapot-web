"use client";

import { useState } from "react";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme";

type ThemeToggleProps = {
  initialTheme: Theme;
  labels: { light: string; dark: string; toggleLabel: string };
};

/**
 * initialTheme sunucuda cookie'den okunup <html data-theme> olarak zaten
 * render edilmiş durumda geliyor — burada useEffect ile "senkronize etmeye"
 * gerek yok, state doğrudan sunucu gerçeğinden başlıyor. Flash yok.
 */
export function ThemeToggle({ initialTheme, labels }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={labels.toggleLabel}
      className="font-mono-data text-xs uppercase tracking-[0.06em] text-foreground/80 hover:text-foreground"
    >
      {theme === "light" ? labels.dark : labels.light}
    </button>
  );
}
