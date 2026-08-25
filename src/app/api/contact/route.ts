import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import {
  contactFormSchema,
  type ContactFieldErrors,
} from "@/lib/contact/schema";
import { isRateLimited } from "@/lib/contact/rateLimit";

// TODO(mock-data): CONTACT_EMAIL_TO gerçek bir gelen kutusu değil —
// env var olarak ayarlanmalı (bkz. .env.example, docs/mock-data-todo.md).
// RESEND_API_KEY de gerçek bir key olmadan bu route 500 döner (yakalanır,
// kullanıcıya "şu anda gönderilemedi" gösterilir — çökmez).
const FROM_ADDRESS =
  process.env.CONTACT_EMAIL_FROM || "Ahtapot Site <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "generic" },
      { status: 400 }
    );
  }

  const result = contactFormSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors: ContactFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in fieldErrors)) {
        fieldErrors[field as keyof ContactFieldErrors] = issue.message;
      }
    }
    return NextResponse.json(
      { ok: false, fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, organization, requestType, message, hp } =
    result.data;

  // Honeypot doluysa bot'a "başarılı" gibi davranıyoruz — sessizce hiç
  // e-posta göndermiyoruz, botu bunu yakaladığımız konusunda uyarmıyoruz.
  if (hp) {
    return NextResponse.json({ ok: true });
  }

  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 }
    );
  }

  const toAddress = process.env.CONTACT_EMAIL_TO;
  if (!toAddress || !process.env.RESEND_API_KEY) {
    console.error(
      "[contact] CONTACT_EMAIL_TO veya RESEND_API_KEY ayarlanmamış — form gönderilemiyor."
    );
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [toAddress],
      replyTo: email,
      subject: `[Site talebi] ${requestType} — ${name}`,
      html: `
        <p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
        <p><strong>Kurum:</strong> ${escapeHtml(organization || "—")}</p>
        <p><strong>Talep türü:</strong> ${escapeHtml(requestType)}</p>
        <p><strong>Mesaj:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
    });

    if (error) {
      console.error("[contact] Resend hatası:", error);
      return NextResponse.json(
        { ok: false, error: "send_failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Beklenmeyen hata:", err);
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 500 }
    );
  }
}
