import type { ComponentType, CSSProperties, Ref } from "react";
import type { ProductLayer } from "@/content/schema";
import { WaterBathModel } from "./WaterBathModel";

export type DeviceModelProps = {
  label: string;
  active?: ProductLayer | null;
  style?: CSSProperties;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

/**
 * content/products/*.json → assets.turntable.model değerinin karşılığı.
 * Yeni bir cihaz çizimi eklemek: modeli yaz, buraya bir satır ekle.
 * Gerçek fotoğraf kareleri gelince model gerekmez (framesPath yeter).
 */
export const DEVICE_MODELS: Record<string, ComponentType<DeviceModelProps>> = {
  "water-bath": WaterBathModel,
};
