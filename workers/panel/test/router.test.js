import assert from "node:assert/strict";
import { mock, test } from "node:test";
import worker, { hedefleriOku } from "../../eposta-yonlendirme.js";
import { memoryKv } from "./fakes.js";

const kv = (map) => ({ PANEL_KV: memoryKv({ "adres-hedefleri": JSON.stringify(map) }) });

test("alıcılar adrese göre KV'den okunur", async () => {
  const env = kv({ "info@ahtapot.ink": ["a@gmail.com"], "destek@ahtapot.ink": ["b@gmail.com"] });
  assert.deepEqual(await hedefleriOku("Destek@ahtapot.ink", env), ["b@gmail.com"]);
});

test("adres haritada yoksa ya da liste boşsa yedek listeye düşer", async () => {
  assert.equal((await hedefleriOku("x@ahtapot.ink", kv({}))).length, 2);
  assert.equal((await hedefleriOku("x@ahtapot.ink", kv({ "x@ahtapot.ink": [] }))).length, 2);
  assert.equal((await hedefleriOku("x@ahtapot.ink", { PANEL_KV: memoryKv() })).length, 2);
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
  assert.equal((await hedefleriOku("x@ahtapot.ink", env)).length, 2);
  mock.restoreAll();
});

test("bir hedef başarısız olsa da diğerine iletilir", async () => {
  mock.method(console, "error", () => {});
  const sent = [];
  const message = {
    to: "info@ahtapot.ink",
    forward: async (address) => {
      if (address === "kotu@gmail.com") throw new Error("doğrulanmamış");
      sent.push(address);
    },
  };
  await worker.email(message, kv({ "info@ahtapot.ink": ["kotu@gmail.com", "iyi@gmail.com"] }));
  assert.deepEqual(sent, ["iyi@gmail.com"]);
  mock.restoreAll();
});
