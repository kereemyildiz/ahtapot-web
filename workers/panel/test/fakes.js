export const DOMAIN = "ahtapot.ink";
export const ROUTER = "eposta-yonlendirme";

export function rule(id, local, target, name = "") {
  return {
    id,
    name,
    matchers: [{ type: "literal", field: "to", value: `${local}@${DOMAIN}` }],
    actions: target ? [{ type: "forward", value: [target] }] : [{ type: "worker", value: [ROUTER] }],
  };
}

export function fakeDeps({ rules = [], addresses = [], keys = [], routes = {}, pending = [] } = {}) {
  const state = {
    rules: [...rules],
    addresses: [...addresses],
    keys: [...keys],
    routes: structuredClone(routes),
    pending: [...pending],
    log: [],
    calls: [],
  };
  let nextId = 1;

  const asRule = (id, { name, address, gmail }) => rule(id, address.split("@")[0], gmail, name);

  const cf = {
    listRules: async () => [...state.rules],
    createRule: async (input) => {
      state.calls.push("createRule");
      state.rules.push(asRule(`r${nextId++}`, input));
    },
    updateRule: async (id, input) => {
      state.calls.push("updateRule");
      state.rules = state.rules.map((item) => (item.id === id ? asRule(id, input) : item));
    },
    deleteRule: async (id) => {
      state.calls.push("deleteRule");
      state.rules = state.rules.filter((item) => item.id !== id);
    },
    listAddresses: async () => [...state.addresses],
    createAddress: async (email) => {
      state.calls.push("createAddress");
      state.addresses.push({ id: `a${nextId++}`, email, verified: null });
    },
    deleteAddress: async (id) => {
      state.calls.push("deleteAddress");
      state.addresses = state.addresses.filter((item) => item.id !== id);
    },
  };

  const resend = {
    listKeys: async () => [...state.keys],
    usage: async () => ({ daily: 3, monthly: 40 }),
    createKey: async (name) => {
      state.calls.push("createKey");
      state.keys.push({ id: `k${nextId++}`, name });
      return `re_token_${name}`;
    },
    deleteKey: async (id) => {
      state.calls.push("deleteKey");
      state.keys = state.keys.filter((item) => item.id !== id);
    },
  };

  const store = {
    getRoutes: async () => structuredClone(state.routes),
    setRoutes: async (routes) => {
      state.routes = structuredClone(routes);
    },
    getPending: async () => [...state.pending],
    setPending: async (list) => {
      state.pending = [...list];
    },
    getLog: async () => [...state.log],
    addLog: async (actor, text) => {
      state.log.unshift({ at: "2026-11-05T10:00:00.000Z", actor, text });
    },
  };

  return {
    state,
    deps: { cf, resend, store, actor: "yonetici@gmail.com", domain: DOMAIN, routerWorker: ROUTER },
  };
}

export function memoryKv(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get: async (key, type) => {
      const value = data.get(key) ?? null;
      return type === "json" && value !== null ? JSON.parse(value) : value;
    },
    put: async (key, value) => {
      data.set(key, value);
    },
  };
}
