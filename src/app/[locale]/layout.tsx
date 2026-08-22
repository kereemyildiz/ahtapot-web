import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  props: Omit<LayoutProps<"/[locale]">, "children">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale: locale as AppLocale,
    namespace: "meta",
  });
  return {
    title: t("siteTitle"),
    description: t("siteDescription"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Tema tercihi cookie'de — SSR'da <html data-theme> doğru değerle
  // render edilir, client'ta flash olmaz (CLAUDE.md). Aydınlık varsayılan;
  // sistem prefers-color-scheme'i otomatik uygulanmıyor (bkz. lib/theme.ts).
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  const tTheme = await getTranslations({ locale, namespace: "theme" });
  const tLocale = await getTranslations({ locale, namespace: "locale" });

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider>
          <SmoothScrollProvider>
            {/* Geçici test çubuğu — nihai nav değil, bu round'da yalnız
                dil/tema geçişinin çalıştığını kanıtlamak için var. */}
            <div className="fixed top-4 right-4 z-50 flex gap-4 bg-background/80 px-3 py-2 backdrop-blur-sm">
              <LocaleSwitcher label={tLocale("switchLabel")} />
              <ThemeToggle
                initialTheme={theme}
                labels={{
                  light: tTheme("light"),
                  dark: tTheme("dark"),
                  toggleLabel: tTheme("toggleLabel"),
                }}
              />
            </div>
            {children}
          </SmoothScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
