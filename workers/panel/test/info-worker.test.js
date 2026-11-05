import assert from "node:assert/strict";
import { mock, test } from "node:test";
import worker, { hedefleriOku } from "../../info-yonlendirme.js";
import { memoryKv } from "./fakes.js";

const kv = (list) => ({ PANEL_KV: memoryKv({ "info-hedefleri": JSON.stringify(list) }) });

test("alıcılar KV'den okunur", async () => {
  assert.deepEqual(await hedefleriOku(kv(["a@gmail.com"])), ["a@gmail.com"]);
});

test("liste boşsa yedek listeye düşer", async () => {
  assert.equal((await hedefleriOku(kv([]))).length, 2);
  assert.equal((await hedefleriOku({ PANEL_KV: memoryKv() })).length, 2);
});

test("KV hata verirse yedek listeye düşer", async () => {
  mock.method(console, "error", () => {});
  const env = {
    PANEL_KV: {
      get: async () => {
        throw new Error("KV kapalı");
      },
    },
  };
  assert.equal((await hedefleriOku(env)).length, 2);
  mock.restoreAll();
});

test("bir hedef başarısız olsa da diğerine iletilir", async () => {
  mock.method(console, "error", () => {});
  const sent = [];
  const message = {
    forward: async (address) => {
      if (address === "kotu@gmail.com") throw new Error("doğrulanmamış");
      sent.push(address);
    },
  };
  await worker.email(message, kv(["kotu@gmail.com", "iyi@gmail.com"]));
  assert.deepEqual(sent, ["iyi@gmail.com"]);
  mock.restoreAll();
});
