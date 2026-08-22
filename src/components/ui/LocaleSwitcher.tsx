"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LocaleSwitcher({ label }: { label: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const next: AppLocale = locale === "tr" ? "en" : "tr";

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: next })}
      aria-label={label}
      className="font-mono-data text-xs uppercase tracking-[0.06em] text-foreground/80 hover:text-foreground"
    >
      {next}
    </button>
  );
}
