import Image from "next/image";
import type { Product } from "@/content/schema";

/**
 * Ana sayfadaki ürün kartı için SAKIN, statik önizleme — canlı
 * turntable/deepzoom etkileşimi burada değil, `/urunler/[slug]` detay
 * sayfasında (CLAUDE.md: ürünler kanıt olarak durur, sitenin merkezi
 * değil; "fancy" etkileşim kendi sayfasında daha çok yer bulsun).
 */
export function ProductPreview({ product }: { product: Product }) {
  const { interaction, assets } = product;

  if (interaction === "turntable" && assets.turntable) {
    const firstFrame = `${assets.turntable.framesPath}01.jpg`;
    return (
      <div className="relative aspect-[4/3] bg-slide">
        <Image
          src={firstFrame}
          alt={`${product.slug} ürün görseli`}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
        />
      </div>
    );
  }

  if (interaction === "deepzoom" && assets.deepzoom) {
    return (
      <div className="relative aspect-[4/3] bg-ink" data-theme="dark">
        <Image
          src="/deepzoom/poster.jpg"
          alt={`${product.slug} örnek doku görüntüsü`}
          fill
          className="object-cover opacity-80"
          sizes="(min-width: 768px) 50vw, 100vw"
        />
      </div>
    );
  }

  const firstImage = assets.gallery[0];
  if (firstImage) {
    return (
      <div className="relative aspect-[4/3]">
        <Image
          src={firstImage.src}
          alt={firstImage.alt}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
        />
      </div>
    );
  }

  return (
    <div
      className="aspect-[4/3] border border-dashed border-steel/40"
      role="img"
      aria-label="Ürün görseli henüz eklenmedi"
    />
  );
}
