import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { SiteRail } from "@/components/layout/SiteRail";
import { Hero } from "@/components/sections/Hero";
import { LayersSection } from "@/components/sections/LayersSection";
import { ProductsSection } from "@/components/sections/ProductsSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { TeamSection } from "@/components/sections/TeamSection";
import {
  ReferencesSection,
  type Reference,
} from "@/components/sections/ReferencesSection";
import { CareerSection } from "@/components/sections/CareerSection";
import { ContactSection } from "@/components/sections/ContactSection";

const LAYER_IDS = [
  "mekanik",
  "elektronik",
  "gomulu",
  "uygulama",
  "saha",
] as const;

// Gerçek referans yok — bölüm hiç render edilmiyor (CLAUDE.md). Veri
// gelince rail'deki tick de otomatik oluşacak (bkz. sectionKeys altında).
const references: Reference[] = [];

export default async function HomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const tLayers = await getTranslations("nav.layers");
  const tSections = await getTranslations("nav.sections");

  const layerMarkers = LAYER_IDS.map((id) => ({ id, label: tLayers(id) }));
  const sectionKeys =
    references.length > 0
      ? ([
          "urunler",
          "hakkimizda",
          "ekip",
          "referanslar",
          "kariyer",
          "iletisim",
        ] as const)
      : (["urunler", "hakkimizda", "ekip", "kariyer", "iletisim"] as const);
  const sectionMarkers = sectionKeys.map((id) => ({ id, label: tSections(id) }));

  return (
    // Asimetrik layout: içerik kolonu ortalanmış değil, rail'e bitişik
    // (CLAUDE.md).
    <div className="flex">
      <SiteRail layerMarkers={layerMarkers} sectionMarkers={sectionMarkers} />
      <main className="w-full max-w-5xl px-6 md:px-16">
        <Hero />
        <LayersSection />
        <ProductsSection />
        <AboutSection />
        <TeamSection />
        <ReferencesSection references={references} />
        <CareerSection />
        <ContactSection />
      </main>
    </div>
  );
}
