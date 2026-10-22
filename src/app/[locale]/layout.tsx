import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { SITE_URL } from "@/lib/seo";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import "../globals.css";

// <head>'deki tek betik, ilk boyamadan önce çalışır:
// 1) Seçilen tema (varsayılan koyu; bkz. ThemeToggle).
// 2) Yenileyince sayfa en üstten açılır (kullanıcı isteği). Tarayıcının konum
//    geri yüklemesi, bölümler sonradan yüklenip sayfa boyu değiştiği için
//    rastgele bir yere düşüyordu; adresteki #bölüm de oraya atlatıyordu.
//    Chrome değeri hem sayfa değişirken hem geri yükleme anında okur: sayfadan
//    çıkarken (pagehide) "manual" yazılır ve yükleme boyunca öyle kalır;
//    yükleme bitince SmoothScrollProvider "auto"ya döndürür (uygulama içi geri
//    tuşu kaldığı yere döner). İlk açılışta #bölüm bağlantısı çalışır;
//    yenilemede #bölüm adresten silinir.
const HEAD_SCRIPT =
  `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}` +
  `try{var h=history,n=performance.getEntriesByType("navigation")[0];` +
  `if(n&&n.type==="reload"&&location.hash)h.replaceState(h.state,"",location.pathname+location.search);` +
  `addEventListener("pagehide",function(){h.scrollRestoration="manual"});` +
  `addEventListener("pageshow",function(e){if(e.persisted)h.scrollRestoration="auto"})}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Yalnız tr/en. Bilinmeyen ilk segment (/favicon.ico, /xyz.txt) render
// edilmeden 404 olur; yoksa kök layout'taki notFound() Worker'da 500 veriyordu.
export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: "#0a0c16",
  colorScheme: "dark",
};

export async function generateMetadata(
  props: Omit<LayoutProps<"/[locale]">, "children">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "meta" });
  // Search Console HTML etiketi ile doğrulama (isteğe bağlı; DNS doğrulaması
  // varsa gerekmez). Değer derleme anında ortam değişkeninden.
  const google = process.env.GOOGLE_SITE_VERIFICATION;
  return {
    metadataBase: new URL(SITE_URL),
    title: t("siteTitle"),
    description: t("siteDescription"),
    applicationName: t("siteTitle"),
    ...(google ? { verification: { google } } : {}),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });
  const tCompany = await getTranslations({ locale, namespace: "company" });

  const links = (["kabiliyet", "urunler", "hakkimizda"] as const).map((id) => ({
    id,
    label: t(id),
  }));

  return (
    <html lang={locale} className={`${fontVariables} h-full`} suppressHydrationWarning>
      <head>
        {/* Kök layout istemcide yeniden çizilmez (dil değişimi tam sayfa
            gezinme): betik yalnız sunucu HTML'inde çalışır, uyarı vermez. */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <SmoothScrollProvider>
          <a
            href="#icerik"
            className="sr-only-focusable fixed left-4 top-4 z-[60] btn btn-primary"
          >
            {t("skip")}
          </a>
          <Header
            locale={locale}
            labels={{
              links,
              cta: t("cta"),
              menu: t("menu"),
              close: t("close"),
              home: t("home"),
              localeLabel: t("localeLabel"),
              localeName: t("localeName"),
              brand: tCompany("shortName"),
              brandSub: tCompany("brandSub"),
              navLabel: t("navLabel"),
              themeToLight: t("themeToLight"),
              themeToDark: t("themeToDark"),
            }}
          />
          <div id="icerik">{children}</div>
          <Footer />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
