export const DOMAIN = "ahtapot.ink";

export function rule(id, local, target, name = "") {
  return {
    id,
    name,
    matchers: [{ type: "literal", field: "to", value: `${local}@${DOMAIN}` }],
    actions: target
      ? [{ type: "forward", value: [target] }]
      : [{ type: "worker", value: ["info-yonlendirme"] }],
  };
}

export function fakeDeps({ rules = [], addresses = [], keys = [], info = [], pending = [] } = {}) {
  const state = {
    rules: [...rules],
    addresses: [...addresses],
    keys: [...keys],
    info: [...info],
    pending: [...pending],
    log: [],
    calls: [],
  };
  let nextId = 1;

  const cf = {
    listRules: async () => [...state.rules],
    createRule: async ({ name, address, gmail }) => {
      state.calls.push("createRule");
      state.rules.push(rule(`r${nextId++}`, address.split("@")[0], gmail, name));
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
    listKeys: async () => ({ keys: [...state.keys], quota: { daily: 3, monthly: 40 } }),
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
    getInfoTargets: async () => [...state.info],
    setInfoTargets: async (list) => {
      state.info = [...list];
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

  return { state, deps: { cf, resend, store, actor: "yonetici@gmail.com", domain: DOMAIN } };
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
