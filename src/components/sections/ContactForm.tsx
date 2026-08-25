"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  contactFormSchema,
  requestTypeSchema,
  type ContactFieldErrors,
} from "@/lib/contact/schema";

type ErrorCode =
  | "required"
  | "invalid"
  | "too_short"
  | "too_long"
  | "generic";

/** zod'un döndürdüğü kısa kodu, alana göre gerçek (lokalize) mesaja çevirir. */
function mapFieldError(
  field: string,
  code: string,
  t: ReturnType<typeof useTranslations<"contact.errors">>
): string {
  const c = code as ErrorCode;
  if (field === "name") return t("nameRequired");
  if (field === "email") return c === "invalid" ? t("emailInvalid") : t("emailRequired");
  if (field === "message") {
    return c === "too_short" ? t("messageTooShort") : t("messageRequired");
  }
  if (field === "consent") return t("consentRequired");
  return t("generic");
}

const REQUEST_TYPE_KEYS = requestTypeSchema.options;

export function ContactForm() {
  const t = useTranslations("contact");
  const tErrors = useTranslations("contact.errors");
  const searchParams = useSearchParams();
  const presetType = searchParams.get("type");
  const initialType = REQUEST_TYPE_KEYS.includes(presetType as never)
    ? (presetType as (typeof REQUEST_TYPE_KEYS)[number])
    : "urun-bilgisi";

  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle"
  );
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const requestTypeLabel: Record<(typeof REQUEST_TYPE_KEYS)[number], string> =
    {
      "urun-bilgisi": t("requestTypes.urunBilgisi"),
      distributorluk: t("requestTypes.distributorluk"),
      demo: t("requestTypes.demo"),
      "is-basvurusu": t("requestTypes.isBasvurusu"),
      diger: t("requestTypes.diger"),
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      organization: String(formData.get("organization") || ""),
      requestType: String(formData.get("requestType") || ""),
      message: String(formData.get("message") || ""),
      consent: formData.get("consent") === "on",
      hp: String(formData.get("hp") || ""),
    };

    const parsed = contactFormSchema.safeParse(values);
    if (!parsed.success) {
      const errors: ContactFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in errors)) {
          errors[field as keyof ContactFieldErrors] = mapFieldError(
            field,
            issue.message,
            tErrors
          );
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (data.ok) {
        setStatus("success");
        return;
      }

      setStatus("idle");
      if (data.fieldErrors) {
        const errors: ContactFieldErrors = {};
        for (const [field, code] of Object.entries(data.fieldErrors)) {
          errors[field as keyof ContactFieldErrors] = mapFieldError(
            field,
            code as string,
            tErrors
          );
        }
        setFieldErrors(errors);
      } else if (data.error === "rate_limited") {
        setFormError(tErrors("rateLimited"));
      } else if (data.error === "send_failed") {
        setFormError(tErrors("sendFailed"));
      } else {
        setFormError(tErrors("generic"));
      }
    } catch {
      setStatus("idle");
      setFormError(tErrors("sendFailed"));
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="border border-ahtapot p-6">
        <p className="font-display text-xl font-semibold">
          {t("success.title")}
        </p>
        <p className="mt-2 font-body text-foreground/80">
          {t("success.body")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <p className="max-w-xl font-body text-foreground/80">{t("intro")}</p>

      {/* Honeypot — gerçek kullanıcıya görünmez/erişilmez (ekran okuyucu
          dahil), naif bot script'leri tüm alanları doldurur. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="hp">Bu alanı boş bırakın</label>
        <input
          type="text"
          id="hp"
          name="hp"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="font-mono-data text-xs uppercase tracking-[0.04em] text-steel"
          >
            {t("fields.name")}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="border border-steel/40 bg-transparent px-3 py-2 font-body text-foreground"
          />
          {fieldErrors.name && (
            <p role="alert" className="font-mono-data text-xs text-eosin">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="font-mono-data text-xs uppercase tracking-[0.04em] text-steel"
          >
            {t("fields.email")}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="border border-steel/40 bg-transparent px-3 py-2 font-body text-foreground"
          />
          {fieldErrors.email && (
            <p role="alert" className="font-mono-data text-xs text-eosin">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="organization"
            className="font-mono-data text-xs uppercase tracking-[0.04em] text-steel"
          >
            {t("fields.organization")}
          </label>
          <input
            type="text"
            id="organization"
            name="organization"
            className="border border-steel/40 bg-transparent px-3 py-2 font-body text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="requestType"
            className="font-mono-data text-xs uppercase tracking-[0.04em] text-steel"
          >
            {t("fields.requestType")}
          </label>
          <select
            id="requestType"
            name="requestType"
            defaultValue={initialType}
            className="border border-steel/40 bg-transparent px-3 py-2 font-body text-foreground"
          >
            {REQUEST_TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {requestTypeLabel[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="message"
          className="font-mono-data text-xs uppercase tracking-[0.04em] text-steel"
        >
          {t("fields.message")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="border border-steel/40 bg-transparent px-3 py-2 font-body text-foreground"
        />
        {fieldErrors.message && (
          <p role="alert" className="font-mono-data text-xs text-eosin">
            {fieldErrors.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2 font-body text-sm text-foreground/80">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1"
          />
          <span>
            {t("consent.label")}{" "}
            <Link
              href="/kvkk"
              target="_blank"
              className="text-ahtapot underline hover:text-eosin"
            >
              {t("consent.linkText")}
            </Link>
          </span>
        </label>
        {fieldErrors.consent && (
          <p role="alert" className="font-mono-data text-xs text-eosin">
            {fieldErrors.consent}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" aria-live="assertive" className="font-mono-data text-xs text-eosin">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-fit border border-foreground px-5 py-3 font-body text-[15px] font-semibold tracking-[0.01em] transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
