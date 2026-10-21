// İstemci tarafı ön doğrulama — zod'suz, tarayıcı paketine ~24 KB zod
// taşımamak için. Kurallar ve hata kodları schema.ts'teki zod şemasıyla
// birebir aynı; asıl doğrulama yine sunucuda (route.ts) zod ile yapılır.

export const REQUEST_TYPES = [
  "urun-bilgisi",
  "distributorluk",
  "demo",
  "is-basvurusu",
  "diger",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

// Talep türü (URL/şema) → içerik anahtarı (`contact.requestTypes`).
export const REQUEST_TYPE_KEY: Record<RequestType, "urunBilgisi" | "demo" | "distributorluk" | "isBasvurusu" | "diger"> = {
  "urun-bilgisi": "urunBilgisi",
  demo: "demo",
  distributorluk: "distributorluk",
  "is-basvurusu": "isBasvurusu",
  diger: "diger",
};

export type ContactValues = {
  name: string;
  email: string;
  organization: string;
  requestType: RequestType;
  message: string;
  consent: boolean;
  hp: string;
};

export type FieldCode = "required" | "invalid" | "too_short" | "too_long";
export type FieldCodes = Partial<Record<keyof ContactValues, FieldCode>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRequestType(value: unknown): value is RequestType {
  return REQUEST_TYPES.includes(value as RequestType);
}

/** Alan → hata kodu; boş nesne = geçerli. */
export function validateContact(raw: ContactValues): { values: ContactValues; errors: FieldCodes } {
  const values = {
    ...raw,
    name: raw.name.trim(),
    email: raw.email.trim(),
    organization: raw.organization.trim(),
    message: raw.message.trim(),
  };
  const errors: FieldCodes = {};
  if (!values.name) errors.name = "required";
  else if (values.name.length > 120) errors.name = "too_long";
  if (!values.email) errors.email = "required";
  else if (!EMAIL.test(values.email)) errors.email = "invalid";
  if (values.organization.length > 200) errors.organization = "too_long";
  if (values.message.length < 10) errors.message = values.message ? "too_short" : "required";
  else if (values.message.length > 4000) errors.message = "too_long";
  if (!values.consent) errors.consent = "required";
  return { values, errors };
}
