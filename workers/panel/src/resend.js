import { ServiceError } from "./errors.js";

const API = "https://api.resend.com";
const PAGE_SIZE = 100;
// Ayda 3.000 gönderim 30 sayfa eder; Worker alt istek sınırı 50.
const MAX_PAGES = 35;

// "2026-10-21 14:53:39.044000+00" biçimini Date'in okuyacağı hale getirir.
function parseCreatedAt(value) {
  return Date.parse(value.replace(" ", "T").replace(/(\.\d{3})\d*/, "$1").replace(/\+00$/, "Z"));
}

const recipientCount = (email) =>
  (email.to?.length ?? 0) + (email.cc?.length ?? 0) + (email.bcc?.length ?? 0);

export function createResend(env) {
  async function call(path, init = {}) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "ahtapot-panel",
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.message ?? `HTTP ${response.status}`;
      console.error("Resend hatası:", path, detail);
      throw new ServiceError(`Resend isteği başarısız: ${detail}`);
    }
    return body;
  }

  async function domainId() {
    const body = await call("/domains");
    const domain = body.data?.find((item) => item.name === env.DOMAIN);
    if (!domain) throw new ServiceError(`Resend'de ${env.DOMAIN} alan adı bulunamadı.`);
    return domain.id;
  }

  return {
    listKeys: async () => (await call("/api-keys")).data ?? [],

    // Resend kullanımı yalnız gönderim yanıtında döndürür, okuma isteklerinde yok.
    // Bu yüzden gönderim listesinden sayılır. Her alıcı kotadan ayrı düşer.
    async usage(now = new Date()) {
      const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
      const usage = { daily: 0, monthly: 0 };
      let after = null;

      for (let page = 0; page < MAX_PAGES; page += 1) {
        const body = await call(`/emails?limit=${PAGE_SIZE}${after ? `&after=${after}` : ""}`);
        for (const email of body.data ?? []) {
          const sentAt = parseCreatedAt(email.created_at);
          if (sentAt < monthStart) return usage;
          usage.monthly += recipientCount(email);
          if (sentAt >= dayStart) usage.daily += recipientCount(email);
        }
        if (!body.has_more) return usage;
        after = body.data.at(-1).id;
      }
      return usage;
    },

    async createKey(name) {
      const body = await call("/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name,
          permission: "sending_access",
          domain_id: await domainId(),
        }),
      });
      return body.token;
    },

    deleteKey: (id) => call(`/api-keys/${id}`, { method: "DELETE" }),
  };
}
