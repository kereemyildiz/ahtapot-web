import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getLocaleContent } from "@/content";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // content/tr.json ve content/en.json — şema doğrulaması ve tr/en anahtar
    // eşleşmesi src/content/index.ts içinde, import anında yapılır. Uyuşmazsa
    // burada (dolayısıyla her request'te / build'de) throw eder.
    messages: getLocaleContent(locale),
  };
});
