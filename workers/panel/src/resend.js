import { ServiceError } from "./errors.js";

const API = "https://api.resend.com";

function quotaHeader(response, name) {
  const value = response.headers.get(name);
  return value === null || value === "" || Number.isNaN(Number(value)) ? null : Number(value);
}

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
    return { body, response };
  }

  async function domainId() {
    const { body } = await call("/domains");
    const domain = body.data?.find((item) => item.name === env.DOMAIN);
    if (!domain) throw new ServiceError(`Resend'de ${env.DOMAIN} alan adı bulunamadı.`);
    return domain.id;
  }

  return {
    async listKeys() {
      const { body, response } = await call("/api-keys");
      return {
        keys: body.data ?? [],
        quota: {
          daily: quotaHeader(response, "x-resend-daily-quota"),
          monthly: quotaHeader(response, "x-resend-monthly-quota"),
        },
      };
    },

    async createKey(name) {
      const { body } = await call("/api-keys", {
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
