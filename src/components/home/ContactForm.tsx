"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LocaleContent } from "@/content/schema";
import { CONTACT_EVENT } from "@/lib/contact/request";
import { REQUEST_TYPES as TYPES, isRequestType, validateContact, type FieldCodes, type RequestType } from "@/lib/contact/validate";

type Labels = LocaleContent["contact"];
type FieldErrors = Partial<Record<keyof FieldCodes, string>>;

// Talep türü (URL/şema) → içerik anahtarı.
const TYPE_KEY: Record<RequestType, "urunBilgisi" | "demo" | "distributorluk" | "isBasvurusu" | "diger"> = {
  "urun-bilgisi": "urunBilgisi",
  demo: "demo",
  distributorluk: "distributorluk",
  "is-basvurusu": "isBasvurusu",
  diger: "diger",
};

export function ContactForm({ labels: t, kvkkHref }: { labels: Labels; kvkkHref: string }) {
  const tErr = t.errors;
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("tur");
  const [type, setType] = useState<RequestType>(isRequestType(fromUrl) ? fromUrl : "urun-bilgisi");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const uid = useId();

  // Ürün/kariyer butonları konuyu bu olayla seçer.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (isRequestType(next)) setType(next);
    };
    window.addEventListener(CONTACT_EVENT, onSelect);
    return () => window.removeEventListener(CONTACT_EVENT, onSelect);
  }, []);

  // ?tur= değişince (detay sayfasından gelince) konuyu render sırasında eşitle.
  const [lastFromUrl, setLastFromUrl] = useState(fromUrl);
  if (fromUrl !== lastFromUrl) {
    setLastFromUrl(fromUrl);
    if (isRequestType(fromUrl)) setType(fromUrl);
  }

  const message = (field: string, code: string): string => {
    if (field === "name") return tErr.nameRequired;
    if (field === "email") return code === "invalid" ? tErr.emailInvalid : tErr.emailRequired;
    if (field === "message") return code === "too_short" ? tErr.messageTooShort : tErr.messageRequired;
    if (field === "consent") return tErr.consentRequired;
    return tErr.generic;
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      organization: String(data.get("organization") || ""),
      requestType: type,
      message: String(data.get("message") || ""),
      consent: data.get("consent") === "on",
      hp: String(data.get("hp") || ""),
    };

    const checked = validateContact(values);
    const codes = Object.entries(checked.errors);
    if (codes.length > 0) {
      const next: FieldErrors = {};
      for (const [field, code] of codes) {
        next[field as keyof FieldErrors] = message(field, code);
      }
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }

    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.values),
      });
      const body = await res.json();
      if (body.ok) {
        setStatus("success");
        return;
      }
      setStatus("idle");
      if (body.fieldErrors) {
        const next: FieldErrors = {};
        for (const [field, code] of Object.entries(body.fieldErrors)) {
          next[field as keyof FieldErrors] = message(field, code as string);
        }
        setErrors(next);
      } else if (body.error === "rate_limited") {
        setFormError(tErr.rateLimited);
      } else if (body.error === "send_failed") {
        setFormError(tErr.sendFailed);
      } else {
        setFormError(tErr.generic);
      }
    } catch {
      setStatus("idle");
      setFormError(tErr.sendFailed);
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="bg-surface p-[clamp(1.5rem,4vw,3rem)]">
        <p className="font-display text-[clamp(1.6rem,1.1rem+1.5vw,2.6rem)] font-medium tracking-[-0.03em]">
          {t.success.title}
        </p>
        <p className="mt-3 text-lead text-ink/90">{t.success.body}</p>
      </div>
    );
  }

  const field = "h-14 w-full bg-field px-4 text-[1.0625rem] text-field-ink outline-none transition-shadow duration-200 placeholder:text-field-ink/50 focus-visible:shadow-[inset_0_0_0_3px_var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const label = "mb-2 block text-small text-muted";
  const errorText = "mt-2 text-small font-medium text-[#ff9db8]";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      {/* Bal küpü: gerçek kullanıcıya görünmez, botlar doldurur. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${uid}-hp`}>Bu alanı boş bırakın</label>
        <input type="text" id={`${uid}-hp`} name="hp" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend className={label}>{t.fields.requestType}</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((value) => {
            const checked = value === type;
            return (
              <label
                key={value}
                className={`relative inline-flex cursor-pointer items-center px-4 py-3 text-[0.95rem] font-medium transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  checked ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink hover:bg-ink hover:text-ground"
                }`}
              >
                <input
                  type="radio"
                  name="requestType"
                  value={value}
                  checked={checked}
                  onChange={() => setType(value)}
                  className="sr-only"
                />
                {t.requestTypes[TYPE_KEY[value]]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-7 md:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={label}>
            {t.fields.name}
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
            className={field}
          />
          {errors.name && (
            <p id={`${uid}-name-err`} className={errorText}>
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={label}>
            {t.fields.email}
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${uid}-email-err` : undefined}
            className={field}
          />
          {errors.email && (
            <p id={`${uid}-email-err`} className={errorText}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-organization`} className={label}>
          {t.fields.organization}
        </label>
        <input id={`${uid}-organization`} name="organization" type="text" autoComplete="organization" className={field} />
      </div>

      <div>
        <label htmlFor={`${uid}-message`} className={label}>
          {t.fields.message}
        </label>
        <textarea
          id={`${uid}-message`}
          name="message"
          rows={5}
          required
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? `${uid}-message-err` : undefined}
          className={`${field} h-auto min-h-40 resize-y py-3 leading-relaxed`}
        />
        {errors.message && (
          <p id={`${uid}-message-err`} className={errorText}>
            {errors.message}
          </p>
        )}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-body text-ink/90">
          <input
            id={`${uid}-consent`}
            type="checkbox"
            name="consent"
            required
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? `${uid}-consent-err` : undefined}
            className="mt-1 size-5 shrink-0 cursor-pointer appearance-none bg-field checked:bg-accent checked:shadow-[inset_0_0_0_4px_var(--color-field)]"
          />
          <span>
            {t.consent.label}{" "}
            <Link href={kvkkHref} target="_blank" className="link">
              {t.consent.linkText}
            </Link>
          </span>
        </label>
        {errors.consent && (
          <p id={`${uid}-consent-err`} className={errorText}>
            {errors.consent}
          </p>
        )}
      </div>

      <div aria-live="assertive">
        {formError && <p className={`${errorText} mt-0`}>{formError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <button type="submit" disabled={status === "submitting"} className="btn btn-primary min-h-14 px-7 text-[1.0625rem] disabled:opacity-60">
          {status === "submitting" ? t.submitting : t.submitByType[TYPE_KEY[type]]}
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 8h11M9 4l4 4-4 4" />
          </svg>
        </button>
        <p className="max-w-[36ch] text-small text-muted">{t.next}</p>
      </div>
    </form>
  );
}
