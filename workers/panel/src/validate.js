import { UserError } from "./errors.js";

// Panelden değiştirilemeyen adresler.
export const SYSTEM_LOCALS = ["info", "talep"];

const RESERVED_LOCALS = [
  ...SYSTEM_LOCALS,
  "abuse",
  "admin",
  "hostmaster",
  "noreply",
  "postmaster",
  "webmaster",
];

// Resend anahtar adı en çok 50 karakter; "gmail-" öneki için 44 kalıyor.
const MAX_LOCAL_LENGTH = 40;
const MAX_NAME_LENGTH = 80;

const LOCAL_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidLocal(local) {
  return local.length <= MAX_LOCAL_LENGTH && LOCAL_PATTERN.test(local);
}

export function parseNewPerson(form, domain) {
  const name = String(form.get("name") ?? "").trim();
  const local = String(form.get("local") ?? "").trim().toLowerCase();
  const gmail = String(form.get("gmail") ?? "").trim().toLowerCase();

  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new UserError(`Ad 1 ile ${MAX_NAME_LENGTH} karakter arasında olmalı.`);
  }
  if (!isValidLocal(local)) {
    throw new UserError(
      `Adres yalnız küçük harf, rakam, nokta, tire ve alt çizgi içerebilir; Türkçe karakter kullanmayın (en çok ${MAX_LOCAL_LENGTH} karakter).`,
    );
  }
  if (RESERVED_LOCALS.includes(local)) {
    throw new UserError(`${local}@${domain} ayrılmış bir adres, başka bir ad seçin.`);
  }
  if (!EMAIL_PATTERN.test(gmail)) {
    throw new UserError("Gmail adresini kontrol edin.");
  }
  if (gmail.endsWith(`@${domain}`)) {
    throw new UserError(`Yönlendirme hedefi ${domain} adresi olamaz, kişinin kendi Gmail'ini yazın.`);
  }

  return { name, local, gmail, info: form.get("info") === "on" };
}
