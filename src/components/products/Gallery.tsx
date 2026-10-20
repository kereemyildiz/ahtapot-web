import Image from "next/image";
import type { Product } from "@/content/schema";
import type { InteractionLabels } from "./ProductInteractionView";

/** Varlığı az olan ürün için sade ekran görüntüsü galerisi. */
export function Gallery({ product, labels }: { product: Product; labels: InteractionLabels }) {
  const [first, ...rest] = product.assets.gallery;
  if (!first) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-surface p-6 text-center text-small text-muted">
        TODO: {product.slug} için görsel eksik.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] bg-surface">
        <Image src={first.src} alt={labels.screens[0] ?? ""} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-left-top" />
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.map((img, i) => (
            <div key={img.src} className="relative aspect-[16/9] bg-surface">
              <Image src={img.src} alt={labels.screens[i + 1] ?? ""} fill sizes="25vw" className="object-cover object-left-top" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
