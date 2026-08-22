import Image from "next/image";
import type { Product } from "@/content/schema";

/**
 * Varsayılan/yedek etkileşim — CLAUDE.md: bilinmeyen `interaction` değeri
 * buraya düşer. Görsel yoksa placeholder yazı değil, sade çerçeveli boş
 * alan (yön verir, özür dilemez — CLAUDE.md).
 */
export function Gallery({ product }: { product: Product }) {
  const images = product.assets.gallery;

  if (images.length === 0) {
    return (
      <div
        className="aspect-[4/3] border border-dashed border-steel/40"
        role="img"
        aria-label="Ürün görseli henüz eklenmedi"
      />
    );
  }

  return (
    <div className="grid aspect-[4/3] grid-cols-2 gap-1 overflow-hidden">
      {images.map((image) => (
        <div key={image.src} className="relative">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 25vw, 50vw"
          />
        </div>
      ))}
    </div>
  );
}
