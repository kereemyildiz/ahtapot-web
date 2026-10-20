import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { PageMotion } from "@/components/motion/PageMotion";
import { Hero } from "@/components/home/Hero";
import { Capability } from "@/components/home/capability/Capability";
import { Products } from "@/components/home/Products";
import { About } from "@/components/home/About";
import { Contact } from "@/components/home/Contact";

// Referanslar bölümü bilinçli olarak yok: gerçek referans verilince eklenir.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  return (
    <main>
      <PageMotion>
        <Hero />
        <Capability />
        <Products />
        <About />
        <Contact />
      </PageMotion>
    </main>
  );
}
