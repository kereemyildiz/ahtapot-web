import Image from "next/image";
import type { CSSProperties } from "react";
import s from "./SB9KPoster.module.css";

/** Görüntünün kadraj içindeki yeri, kap yüksekliği biriminde (merkeze göre). */
export type PosterBox = { left: number; top: number; width: number; height: number };

/**
 * WebGL modeli yüklenirken onun yerinde duran statik görüntü: aynı modelin
 * aynı kameradan çizimi (tools/cad/README.md → "Poster"). Görüntüleyici
 * hazır olunca altında kalır ve söner; eski CSS çizimi bir an görünmez.
 * Kap `container-type: size` olmalı (bkz. SB9KPoster.module.css).
 */
export function SB9KPoster({ src, box, hidden }: { src: string; box: PosterBox; hidden: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={s.poster}
      style={{ "--l": box.left, "--t": box.top, "--w": box.width, "--h": box.height, opacity: hidden ? 0 : 1 } as CSSProperties}
    >
      <Image src={src} alt="" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-contain" />
    </div>
  );
}
