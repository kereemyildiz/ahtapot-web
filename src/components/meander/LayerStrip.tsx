import { buildMiniKinkPath } from "./kinkPath";
import type { ProductLayer } from "@/content/schema";

const ALL_LAYERS: ProductLayer[] = ["mekanik", "elektronik", "gomulu", "uygulama"];
const GLYPH_SIZE = 14;

type LayerStripProps = {
  activeLayers: ProductLayer[];
  labels: Record<ProductLayer, string>;
};

/**
 * Ürün kartındaki mini rail (spec §4) — ana rail'in aynı SVG modülünün
 * küçültülmüş, yatay hali. Ürünün `layers` alanındaki katmanlar dolu
 * (ahtapot), dışındakiler soluk hairline (steel/30) olarak render edilir.
 * `saha` burada yok — Product.layers tipi zaten 4 değerle sınırlı.
 */
export function LayerStrip({ activeLayers, labels }: LayerStripProps) {
  const glyph = buildMiniKinkPath(GLYPH_SIZE);

  return (
    <ul className="flex items-end gap-3" aria-label="Katman kompozisyonu">
      {ALL_LAYERS.map((layer) => {
        const active = activeLayers.includes(layer);
        return (
          <li key={layer} className="flex flex-col items-center gap-1">
            <svg
              width={GLYPH_SIZE * 0.7}
              height={GLYPH_SIZE}
              viewBox={`0 0 ${GLYPH_SIZE * 0.7} ${GLYPH_SIZE}`}
              aria-hidden="true"
            >
              <path
                d={glyph}
                fill="none"
                stroke={active ? "var(--color-ahtapot)" : "var(--color-steel)"}
                strokeOpacity={active ? 1 : 0.3}
                strokeWidth={1.5}
              />
            </svg>
            <span
              className="font-mono-data text-[10px] uppercase tracking-[0.05em]"
              style={{
                color: active ? "var(--color-ahtapot)" : "var(--color-steel)",
                opacity: active ? 1 : 0.5,
              }}
            >
              {labels[layer]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
