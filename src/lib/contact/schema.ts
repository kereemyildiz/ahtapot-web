import { z } from "zod";

// Talep türleri — spec'te verilen 5 sabit değer.
export const requestTypeSchema = z.enum([
  "urun-bilgisi",
  "distributorluk",
  "demo",
  "is-basvurusu",
  "diger",
]);
export type RequestType = z.infer<typeof requestTypeSchema>;

/**
 * Client ve server AYNI şemayı kullanıyor. Mesajlar burada YOK — zod'un
 * kendi hata metnini kullanıcıya göstermiyoruz (tek dil olurdu, i18n'e
 * uymazdı). Server yalnız HANGİ alanın hangi KOD ile başarısız olduğunu
 * döndürüyor (`fieldErrorCode` — bkz. route.ts), client bunu
 * `content/{locale}.json` → `contact.errors`'tan localize ediyor.
 *
 * Honeypot (`hp`) — gerçek kullanıcıya görünmeyen, botların doldurduğu
 * gizli alan. Boş gelmeli; doluysa sessizce "başarılı" gibi davranılır.
 */
export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "too_long"),
  email: z.string().trim().min(1, "required").email("invalid"),
  organization: z.string().trim().max(200, "too_long").optional().or(z.literal("")),
  requestType: requestTypeSchema,
  message: z.string().trim().min(10, "too_short").max(4000, "too_long"),
  consent: z.boolean().refine((value) => value === true, "required"),
  // Honeypot: DEĞER SINIRLANMAZ. Burada max(0) gibi bir kısıt olursa dolu
  // gelen hp validasyonu kırar ve route.ts'teki "sessizce başarılı davran"
  // dalına hiç ulaşılmaz — bot'a tam da gizlemek istediğimiz şeyi
  // (yakalandığını) bir hata yanıtıyla ele vermiş oluruz. Kontrol tamamen
  // route.ts'te: hp doluysa {ok:true} dönülür, mail gönderilmez.
  hp: z.string().optional().or(z.literal("")),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/**
 * Server'ın döndürdüğü alan-bazlı hata kodları — client bunları
 * `contact.errors`'taki gerçek metinlere eşliyor (bkz. ContactForm.tsx).
 */
export type ContactFieldErrors = Partial<
  Record<keyof ContactFormValues, string>
>;
