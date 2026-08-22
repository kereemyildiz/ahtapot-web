import trRaw from "../../content/tr.json";
import enRaw from "../../content/en.json";
import { localeContentSchema, type LocaleContent } from "./schema";
import type { AppLocale } from "@/i18n/routing";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * content/tr.json ve content/en.json'un anahtar kümesini derinlemesine
 * karşılaştırır. Bir dilde olup diğerinde olmayan herhangi bir anahtar
 * (nested objelerde ve `products` record'unda dahil) burada throw eder —
 * bu da modül import edildiği an (dolayısıyla her dev/build çalıştırmasında)
 * build'i kırar. zod'un .strict()'i tek dosya içindeki fazlalıkları
 * yakalıyor; bu fonksiyon iki dosya *arasındaki* farkı yakalıyor.
 */
function assertMatchingKeys(a: unknown, b: unknown, path: string[] = []): void {
  if (!isPlainObject(a) || !isPlainObject(b)) return;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  const onlyInA = aKeys.filter((key) => !bKeys.includes(key));
  const onlyInB = bKeys.filter((key) => !aKeys.includes(key));

  if (onlyInA.length > 0 || onlyInB.length > 0) {
    const location = path.length > 0 ? path.join(".") : "(kök)";
    const details = [
      onlyInA.length > 0
        ? `tr.json'da var, en.json'da yok: ${onlyInA.join(", ")}`
        : null,
      onlyInB.length > 0
        ? `en.json'da var, tr.json'da yok: ${onlyInB.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    throw new Error(
      `content/tr.json ile content/en.json anahtarları uyuşmuyor [${location}]: ${details}`
    );
  }

  for (const key of aKeys) {
    assertMatchingKeys(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
      [...path, key]
    );
  }
}

assertMatchingKeys(trRaw, enRaw);

const localeContent: Record<AppLocale, LocaleContent> = {
  tr: localeContentSchema.parse(trRaw),
  en: localeContentSchema.parse(enRaw),
};

export function getLocaleContent(locale: AppLocale): LocaleContent {
  return localeContent[locale];
}
