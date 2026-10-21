import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import {
  contactFormSchema,
  type ContactFieldErrors,
} from "@/lib/contact/schema";
import { isRateLimited } from "@/lib/contact/rateLimit";
import { REQUEST_TYPE_KEY } from "@/lib/contact/validate";
// Şema doğrulaması build'de sayfalar üzerinden yapılıyor; burada yeniden zod
// çalıştırmak Worker'ın ilk açılış CPU süresine eklenir (ücretsiz plan: 10 ms).
import tr from "../../../../content/tr.json";

// Canlıda RESEND_API_KEY, CONTACT_EMAIL_TO ve CONTACT_EMAIL_FROM Cloudflare
// Worker secret'ı (bkz. docs/deploy-cloudflare.md). Yoksa bu route 500 döner
// (yakalanır, kullanıcıya "şu anda gönderilemedi" gösterilir — çökmez).
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
  // Cloudflare gerçek istemci IP'sini cf-connecting-ip'de verir;
  // x-forwarded-for yerel geliştirme için yedek.
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || "unknown";
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
    // Talepleri okuyan ekip Türkçe; konu ve gövde formun dilinden bağımsız TR.
    const typeLabel = tr.contact.requestTypes[REQUEST_TYPE_KEY[requestType]];
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [toAddress],
      replyTo: email,
      subject: `[Site talebi] ${typeLabel} — ${name}`,
      html: `
        <p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
        <p><strong>Kurum:</strong> ${escapeHtml(organization || "—")}</p>
        <p><strong>Talep türü:</strong> ${escapeHtml(typeLabel)}</p>
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

    console.log("[contact] Gönderildi, Resend id:", data?.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Beklenmeyen hata:", err);
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 500 }
    );
  }
}
