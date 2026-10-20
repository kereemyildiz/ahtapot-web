"use client";

import type { ComponentType } from "react";
import type { Product, ProductLayer } from "@/content/schema";
import type { InteractionLabels } from "./ProductInteractionView";
import { WaterBathSimulator } from "./simulator/WaterBathSimulator";
import { Turntable } from "./Turntable";

type SimulatorProps = { product: Product; labels: InteractionLabels; activeLayer?: ProductLayer | null };

/**
 * assets.simulator.kind → simülatör. Yeni bir cihazın simülasyonu: fizik
 * modelini ve arayüzünü yaz, buraya bir satır ekle. Bilinmeyen tür
 * turntable'a düşer.
 */
const SIMULATORS: Record<string, ComponentType<SimulatorProps>> = {
  "water-bath": WaterBathSimulator,
};

export function Simulator(props: SimulatorProps) {
  const kind = props.product.assets.simulator?.kind;
  const Component = (kind && SIMULATORS[kind]) || Turntable;
  return <Component {...props} />;
}
