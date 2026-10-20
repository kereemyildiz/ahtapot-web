"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { localeHref, swapLocale } from "@/i18n/href";
import Image from "next/image";
import { LogoMark } from "@/components/brand/LogoMark";
import { useLenisContext } from "@/components/providers/LenisContext";

type HeaderProps = {
  locale: AppLocale;
  labels: {
    links: { id: string; label: string }[];
    cta: string;
    menu: string;
    close: string;
    home: string;
    localeLabel: string;
    localeName: string;
    brand: string;
    brandSub: string;
    navLabel: string;
  };
};

export function Header({ locale, labels }: HeaderProps) {
  const pathname = usePathname();
  const { scrollToId } = useLenisContext();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const home = localeHref(locale, "/");
  const isHome = pathname === home;
  const otherLocale: AppLocale = locale === "tr" ? "en" : "tr";
  const otherHref = swapLocale(pathname, otherLocale);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Ana sayfadaysak Lenis ile kaydır; değilsek normal bağlantı /#id'ye gider.
  const onAnchor = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (!isHome) return;
    e.preventDefault();
    scrollToId(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? "bg-ground" : "bg-transparent"
      }`}
    >
      <div className="frame flex h-[var(--header-h)] items-center justify-between gap-6">
        <Link
          href={home}
          aria-label={labels.home}
          className="flex items-center gap-3 text-ink"
          onClick={isHome ? onAnchor("top") : undefined}
        >
          <LogoMark className="h-10 w-auto" strokeWidth={44} gradientId="logo-header" />
          <span className="flex flex-col items-start gap-[3px]">
            {/* Logodaki yazı: public/logo.jpg'den çıkarılmış, düz marka mavisi. */}
            <Image src="/brand/wordmark.png" alt="" width={82} height={21} priority className="h-[21px] w-auto" />
            {/* Altında küçük satır; logonun parçası, o yüzden de mavi. */}
            <span className="text-[0.6rem] font-semibold uppercase leading-none tracking-[0.16em] text-periwinkle">
              {labels.brandSub}
            </span>
          </span>
        </Link>

        <nav aria-label={labels.navLabel} className="hidden items-center gap-8 lg:flex">
          {labels.links.map((link) => (
            <a
              key={link.id}
              href={`/${locale}#${link.id}`}
              onClick={onAnchor(link.id)}
              className="text-[0.95rem] text-muted transition-colors duration-200 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <Link
            href={otherHref}
            aria-label={labels.localeLabel}
            lang={otherLocale}
            className="text-[0.95rem] text-muted transition-colors duration-200 hover:text-ink"
          >
            {labels.localeName}
          </Link>
          <a
            href={`/${locale}#iletisim`}
            onClick={onAnchor("iletisim")}
            className="btn btn-primary min-h-0 py-3 text-[0.95rem]"
          >
            {labels.cta}
          </a>
        </nav>

        <button
          type="button"
          className="btn btn-quiet min-h-0 py-2.5 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? labels.close : labels.menu}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label={labels.navLabel}
          className="frame flex h-[calc(100svh-var(--header-h))] flex-col gap-2 bg-ground pb-10 pt-6 lg:hidden"
        >
          {labels.links.map((link) => (
            <a
              key={link.id}
              href={`/${locale}#${link.id}`}
              onClick={onAnchor(link.id)}
              className="display py-2 text-[2rem] text-ink"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-auto flex flex-wrap items-center gap-4">
            <a href={`/${locale}#iletisim`} onClick={onAnchor("iletisim")} className="btn btn-primary">
              {labels.cta}
            </a>
            <Link
              href={otherHref}
              lang={otherLocale}
              aria-label={labels.localeLabel}
              className="btn btn-quiet"
            >
              {labels.localeName}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
