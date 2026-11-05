const ROUTES_KEY = "adres-hedefleri";
const PENDING_KEY = "bekleyenler";
const LOG_KEY = "islem-kaydi";
const LOG_LIMIT = 50;

export function createStore(kv) {
  return {
    // { "info@ahtapot.ink": ["a@gmail.com", "b@gmail.com"] }: birden fazla alıcılı adresler.
    getRoutes: async () => (await kv.get(ROUTES_KEY, "json")) ?? {},
    setRoutes: (routes) => kv.put(ROUTES_KEY, JSON.stringify(routes)),

    // Gmail'i doğrulanınca alıcı olacaklar: { name, local, address, gmail }.
    getPending: async () => (await kv.get(PENDING_KEY, "json")) ?? [],
    setPending: (pending) => kv.put(PENDING_KEY, JSON.stringify(pending)),

    getLog: async () => (await kv.get(LOG_KEY, "json")) ?? [],
    async addLog(actor, text, at = new Date().toISOString()) {
      const log = (await kv.get(LOG_KEY, "json")) ?? [];
      await kv.put(LOG_KEY, JSON.stringify([{ at, actor, text }, ...log].slice(0, LOG_LIMIT)));
    },
  };
}
