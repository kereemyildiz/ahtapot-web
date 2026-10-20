// Zod'suz sabitler: istemci bileşenleri buradan import eder, zod şeması
// (schema.ts) tarayıcı paketine girmesin.

export const LAYER_IDS = ["mekanik", "elektronik", "gomulu", "uygulama", "saha"] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export const PRODUCT_LAYERS = ["mekanik", "elektronik", "gomulu", "uygulama"] as const;
export type ProductLayer = (typeof PRODUCT_LAYERS)[number];
