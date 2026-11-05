import { ServiceError } from "./errors.js";

const API = "https://api.cloudflare.com/client/v4";
const PAGE_SIZE = 50;

export function createCloudflare(env) {
  const rulesPath = `/zones/${env.CF_ZONE_ID}/email/routing/rules`;
  const addressesPath = `/accounts/${env.CF_ACCOUNT_ID}/email/routing/addresses`;

  async function call(path, init = {}) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      const detail = body?.errors?.[0]?.message ?? `HTTP ${response.status}`;
      console.error("Cloudflare hatası:", path, detail);
      throw new ServiceError(`Cloudflare isteği başarısız: ${detail}`);
    }
    return body;
  }

  async function listAll(path) {
    const items = [];
    for (let page = 1; ; page += 1) {
      const body = await call(`${path}?page=${page}&per_page=${PAGE_SIZE}`);
      const results = body.result ?? [];
      items.push(...results);
      if (results.length < PAGE_SIZE) return items;
    }
  }

  return {
    listRules: () => listAll(rulesPath),

    createRule: ({ name, address, gmail }) =>
      call(rulesPath, {
        method: "POST",
        body: JSON.stringify({
          name,
          enabled: true,
          matchers: [{ type: "literal", field: "to", value: address }],
          actions: [{ type: "forward", value: [gmail] }],
        }),
      }),

    deleteRule: (id) => call(`${rulesPath}/${id}`, { method: "DELETE" }),

    listAddresses: () => listAll(addressesPath),

    createAddress: (email) =>
      call(addressesPath, { method: "POST", body: JSON.stringify({ email }) }),

    deleteAddress: (id) => call(`${addressesPath}/${id}`, { method: "DELETE" }),
  };
}
