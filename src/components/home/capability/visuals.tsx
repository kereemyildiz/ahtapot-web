import Image from "next/image";
import type { LayerId } from "@/content/constants";
import type { MediaImage } from "@/content/schema";
import dynamic from "next/dynamic";
import type { CadLabels } from "./CadViewport";
import type { PcbLabels } from "./PcbLayout";
import type { IdeLabels } from "./FirmwareIde";
import type { FieldLabels } from "./FieldService";

// Araç ekranları ilk ekranın altında: ilk yüklemeye girmesinler (JS bütçesi),
// yalnız istemcide ve gerektiğinde yüklensinler.
const toolFallback = () => <div className="absolute inset-0 bg-tool" />;
const CadViewport = dynamic(() => import("./CadViewport").then((m) => m.CadViewport), { ssr: false, loading: toolFallback });
const PcbLayout = dynamic(() => import("./PcbLayout").then((m) => m.PcbLayout), { ssr: false, loading: toolFallback });
const FirmwareIde = dynamic(() => import("./FirmwareIde").then((m) => m.FirmwareIde), { ssr: false, loading: toolFallback });
const FieldService = dynamic(() => import("./FieldService").then((m) => m.FieldService), { ssr: false, loading: toolFallback });

/**
 * Yetkinlikler sahnesinin görselleri. Mekanik, elektronik, gömülü yazılım ve
 * saha katmanları birer mühendislik aracının çalışma ekranı (CAD, kart
 * tasarımı, IDE, servis); uygulama katmanı gerçek AhtaPatolog ekranları.
 * Araç ekranları temsilidir: belirli bir ürünün ölçüsü, devresi ya da kodu
 * değil (açıklama satırında yazar).
 */

/**
 * Birden çok ekran görüntüsü: üst üste duran pencereler sırayla öne gelir
 * (globals.css → .screen-card). Görüntüler kırpılmaz, kendi oranlarında.
 */
function ScreenStack({ images, alt }: { images: MediaImage[]; alt: string }) {
  return (
    <div className="absolute inset-0" role="img" aria-label={alt}>
      {images.map((img, i) => (
        <div
          key={img.src}
          className="screen-card absolute left-1/2 top-[46%] w-[84%] -translate-x-1/2 -translate-y-1/2 shadow-[0_24px_60px_var(--window-shadow)] ring-1 ring-periwinkle/25"
          style={{ aspectRatio: `${img.width} / ${img.height}`, animationDelay: `${-i * 3}s` }}
        >
          <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 46vw, 84vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

export type VisualItem = {
  id: LayerId;
  caption: string;
  alt: string;
  deliverables: string[];
  /** Tek fotoğraf (duotone) ya da birden çok ekran görüntüsü (pencereler). */
  images: MediaImage[];
};

export type ToolLabels = { cad: CadLabels; pcb: PcbLabels; ide: IdeLabels; field: FieldLabels };

export function LayerVisual({
  item,
  tools,
  active,
  eager = false,
}: {
  item: VisualItem;
  tools: ToolLabels;
  /** Sahnede etkin mi: araç ekranlarının döngüleri yalnız etkinken çalışır. */
  active: boolean;
  eager?: boolean;
}) {
  const [first] = item.images;
  const tool =
    item.id === "mekanik" ? (
      <CadViewport labels={tools.cad} active={active} />
    ) : item.id === "elektronik" ? (
      <PcbLayout labels={tools.pcb} active={active} />
    ) : item.id === "gomulu" ? (
      <FirmwareIde labels={tools.ide} active={active} />
    ) : item.id === "saha" ? (
      <FieldService labels={tools.field} steps={item.deliverables} active={active} />
    ) : null;

  // Araç ekranı: kendi araç ve durum çubukları var; açıklama altında ayrı satır.
  if (tool) {
    return (
      <div className="@container absolute inset-0 flex flex-col overflow-hidden bg-tool after:pointer-events-none after:absolute after:inset-0 after:shadow-[inset_0_0_0_1px_var(--color-tool-line)]" role="img" aria-label={item.alt}>
        <div className="relative min-h-0 flex-1">{tool}</div>
        <p className="shrink-0 border-t border-periwinkle/15 bg-ground px-3 py-2 text-small text-muted">{item.caption}</p>
      </div>
    );
  }

  /** Fotoğraf (duotone) ya da birden çok ekran görüntüsü (pencereler). */
  return (
    <div className="@container absolute inset-0 overflow-hidden bg-tool after:pointer-events-none after:absolute after:inset-0 after:shadow-[inset_0_0_0_1px_var(--color-tool-line)]">
      {item.images.length > 1 ? (
        <>
          <div aria-hidden="true" className="hero-glow absolute inset-0" />
          <ScreenStack images={item.images} alt={item.alt} />
        </>
      ) : first ? (
        <div className="photo-duo absolute inset-0 [--duo-bright:0.36]">
          <Image
            data-photo=""
            src={first.src}
            alt={item.alt}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <p className="absolute bottom-4 left-4 bg-ground/80 px-3 py-2 text-small text-ink/80">{item.caption}</p>
    </div>
  );
}
