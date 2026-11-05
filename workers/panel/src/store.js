const INFO_KEY = "info-hedefleri";
const PENDING_KEY = "bekleyenler";
const LOG_KEY = "islem-kaydi";
const LOG_LIMIT = 50;

export function createStore(kv) {
  const readList = async (key) => (await kv.get(key, "json")) ?? [];
  const writeList = (key, list) => kv.put(key, JSON.stringify(list));

  return {
    getInfoTargets: () => readList(INFO_KEY),
    setInfoTargets: (targets) => writeList(INFO_KEY, targets),

    getPending: () => readList(PENDING_KEY),
    setPending: (pending) => writeList(PENDING_KEY, pending),

    getLog: () => readList(LOG_KEY),
    async addLog(actor, text, at = new Date().toISOString()) {
      const log = await readList(LOG_KEY);
      await writeList(LOG_KEY, [{ at, actor, text }, ...log].slice(0, LOG_LIMIT));
    },
  };
}
