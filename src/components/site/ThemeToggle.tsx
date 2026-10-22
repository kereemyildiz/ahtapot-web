"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/brand/Icon";

type Theme = "dark" | "light";

const THEME_COLOR: Record<Theme, string> = { dark: "#0a0c16", light: "#f5f6fb" };

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/**
 * Koyu (varsayılan, "karanlık oda") ↔ açık tema. Seçim localStorage'da
 * ("theme"); layout'taki betik onu ilk boyamadan önce <html data-theme>'a yazar.
 * İkon gidilecek temayı gösterir, adı da onu söyler.
 */
export function ThemeToggle({ toLight, toDark, className = "" }: { toLight: string; toDark: string; className?: string }) {
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);

  // Tarayıcı çubuğunun rengi (mobil) temayla aynı olsun.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {
        // Gizli pencere vb.: seçim bu sayfada geçerli, kalıcı olmaz.
      }
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && typeof document.startViewTransition === "function") document.startViewTransition(apply);
    else apply();
  };

  const label = theme === "light" ? toDark : toLight;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid place-items-center border border-surface-2 text-muted transition-colors duration-200 hover:text-ink ${className}`}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} className="size-[1.05rem]" />
    </button>
  );
}
