import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addAddress,
  addRecipient,
  applyVerifiedPending,
  deleteAddress,
  issueKey,
  loadOverview,
  removeRecipient,
} from "../src/addresses.js";
import { UserError } from "../src/errors.js";
import { DOMAIN, fakeDeps, ROUTER, rule } from "./fakes.js";

const KEREM = "kerem@gmail.com";
const MUSTAFA = "mustafa@gmail.com";
const AHMET = "ahmet@gmail.com";
const INFO = `info@${DOMAIN}`;

const base = () => ({
  rules: [
    rule("info", "info", null),
    rule("talep", "talep", KEREM),
    rule("kerem", "kerem", KEREM, "Kerem"),
    rule("mustafa", "mustafa", MUSTAFA, "Mustafa"),
  ],
  addresses: [
    { id: "a-kerem", email: KEREM, verified: "2026-10-21" },
    { id: "a-mustafa", email: MUSTAFA, verified: "2026-10-22" },
  ],
  keys: [
    { id: "k-kerem", name: "gmail-kerem" },
    { id: "k-mustafa", name: "gmail-mustafa" },
    { id: "k-form", name: "ahtapot-web iletisim formu" },
  ],
  routes: { [INFO]: [KEREM, MUSTAFA] },
});

const newAddress = { name: "Ahmet Yılmaz", local: "ahmet.yilmaz", gmail: AHMET };
const verify = (state, gmail) => {
  state.addresses.find((item) => item.email === gmail).verified = "2026-11-05";
};
const row = async (deps, local) =>
  (await loadOverview(deps)).rows.find((item) => item.local === local);

test("genel görünüm tüm adresleri aynı listede gösterir", async () => {
  const { deps } = fakeDeps(base());
  const { rows, usage } = await loadOverview(deps);

  assert.deepEqual(rows.map((item) => item.local), ["info", "kerem", "mustafa", "talep"]);
  assert.deepEqual(
    rows[0].recipients.map((item) => item.email),
    [KEREM, MUSTAFA],
  );
  assert.equal(rows[0].protectedReason, "Site ve form kullanıyor");
  assert.equal(rows[0].sendsWithRecipientKeys, true);
  assert.equal(rows[1].key.id, "k-kerem");
  assert.equal(rows[1].protectedReason, null);
  assert.deepEqual(usage, { daily: 3, monthly: 40 });
});

test("kota okunamazsa panel yine açılır", async () => {
  const { deps } = fakeDeps(base());
  deps.resend.usage = async () => {
    throw new Error("Resend kapalı");
  };
  assert.deepEqual((await loadOverview(deps)).usage, { daily: null, monthly: null });
});

test("doğrulanmış Gmail ile adres hemen açılır", async () => {
  const { deps, state } = fakeDeps(base());
  const result = await addAddress(deps, { ...newAddress, gmail: KEREM });

  assert.equal(result, "acildi");
  assert.deepEqual(state.calls, ["createRule"]);
  assert.equal(state.pending.length, 0);
});

test("yeni Gmail doğrulanınca adres kendiliğinden açılır", async () => {
  const { deps, state } = fakeDeps(base());
  assert.equal(await addAddress(deps, newAddress), "dogrulama");
  assert.equal(state.rules.length, 4);

  const waiting = await row(deps, "ahmet.yilmaz");
  assert.equal(waiting.recipients[0].waiting, true);

  await applyVerifiedPending(deps);
  assert.equal(state.rules.length, 4);

  verify(state, AHMET);
  await applyVerifiedPending(deps);
  assert.equal(state.rules.at(-1).name, "Ahmet Yılmaz");
  assert.equal(state.pending.length, 0);
  assert.equal((await row(deps, "ahmet.yilmaz")).recipients[0].waiting, false);
});

test("var olan ya da bekleyen adres yeniden açılamaz", async () => {
  const { deps } = fakeDeps(base());
  await assert.rejects(addAddress(deps, { ...newAddress, local: "kerem" }), UserError);

  await addAddress(deps, newAddress);
  await assert.rejects(addAddress(deps, newAddress), UserError);
});

test("ikinci alıcıyla adres yönlendirme Worker'ına geçer, KV önce yazılır", async () => {
  const { deps, state } = fakeDeps(base());
  const order = [];
  const { setRoutes } = deps.store;
  const { updateRule } = deps.cf;
  deps.store.setRoutes = async (routes) => {
    order.push("kv");
    await setRoutes(routes);
  };
  deps.cf.updateRule = async (id, input) => {
    order.push("kural");
    assert.equal(input.worker, ROUTER);
    await updateRule(id, input);
  };

  assert.equal(await addRecipient(deps, "kerem", MUSTAFA), "alici");

  assert.deepEqual(order, ["kv", "kural"]);
  assert.deepEqual(state.routes[`kerem@${DOMAIN}`], [KEREM, MUSTAFA]);
  assert.equal(state.rules.find((item) => item.id === "kerem").actions[0].type, "worker");
  assert.equal(state.rules.find((item) => item.id === "kerem").name, "Kerem");
});

test("Worker'daki adrese üçüncü alıcı kuralı değiştirmeden eklenir", async () => {
  const { deps, state } = fakeDeps({
    ...base(),
    addresses: [...base().addresses, { id: "a-ahmet", email: AHMET, verified: "2026-11-01" }],
  });
  await addRecipient(deps, "info", AHMET);

  assert.deepEqual(state.routes[INFO], [KEREM, MUSTAFA, AHMET]);
  assert.equal(state.calls.includes("updateRule"), false);
});

test("alıcı bire inince adres doğrudan iletime döner ve KV'den silinir", async () => {
  const { deps, state } = fakeDeps(base());
  await removeRecipient(deps, "info", MUSTAFA);

  assert.equal(state.routes[INFO], undefined);
  const action = state.rules.find((item) => item.id === "info").actions[0];
  assert.deepEqual(action, { type: "forward", value: [KEREM] });
});

test("son alıcı çıkarılamaz", async () => {
  const { deps, state } = fakeDeps(base());
  await assert.rejects(removeRecipient(deps, "mustafa", MUSTAFA), /son alıcısı/);
  assert.equal(state.rules.length, 4);
});

test("başka adreste kullanılan Gmail hedef listesinde kalır", async () => {
  const { deps, state } = fakeDeps(base());
  await removeRecipient(deps, "info", KEREM);
  assert.ok(state.addresses.some((item) => item.email === KEREM));
});

test("bekleyen alıcı çıkarılınca doğrulanmamış hedef de silinir", async () => {
  const { deps, state } = fakeDeps(base());
  await addRecipient(deps, "info", AHMET);
  assert.equal(state.pending.length, 1);

  await removeRecipient(deps, "info", AHMET);
  assert.equal(state.pending.length, 0);
  assert.equal(state.addresses.some((item) => item.email === AHMET), false);
});

test("aynı alıcı ikinci kez eklenemez", async () => {
  const { deps } = fakeDeps(base());
  await assert.rejects(addRecipient(deps, "info", KEREM), /zaten/);
});

test("adres silinince anahtarı, kuralı ve boşta kalan hedefi gider", async () => {
  const { deps, state } = fakeDeps({ ...base(), routes: {} });
  state.rules = state.rules.filter((item) => item.id !== "info");
  await deleteAddress(deps, "mustafa");

  assert.equal(state.rules.some((item) => item.id === "mustafa"), false);
  assert.equal(state.keys.some((item) => item.id === "k-mustafa"), false);
  assert.equal(state.addresses.some((item) => item.email === MUSTAFA), false);
});

test("Worker'daki adres silinince KV kaydı da gider", async () => {
  const fixture = base();
  fixture.routes[`destek@${DOMAIN}`] = [KEREM, MUSTAFA];
  fixture.rules.push(rule("destek", "destek", null));
  const { deps, state } = fakeDeps(fixture);

  await deleteAddress(deps, "destek");
  assert.equal(state.routes[`destek@${DOMAIN}`], undefined);
  assert.ok(state.routes[INFO]);
  assert.ok(state.addresses.some((item) => item.email === MUSTAFA));
});

test("korunan adresler silinemez", async () => {
  const { deps, state } = fakeDeps(base());
  await assert.rejects(deleteAddress(deps, "info"), UserError);
  assert.equal(state.rules.length, 4);
});

test("korunan adresin alıcısı değiştirilebilir", async () => {
  const { deps, state } = fakeDeps(base());
  await removeRecipient(deps, "info", MUSTAFA);
  assert.equal(state.rules.find((item) => item.id === "info").actions[0].type, "forward");
});

test("anahtar yenileme önce yenisini üretir, sonra eskisini siler", async () => {
  const { deps, state } = fakeDeps(base());
  const issued = await issueKey(deps, "mustafa");

  assert.equal(issued.token, "re_token_gmail-mustafa");
  assert.equal(issued.renewed, true);
  assert.deepEqual(state.calls, ["createKey", "deleteKey"]);
  assert.ok(state.keys.some((item) => item.id === "k-form"));
});

test("anahtar, kişinin alıcısı olduğu her adresi talimata katar", async () => {
  const { deps } = fakeDeps(base());
  const { sendAs } = await issueKey(deps, "mustafa");

  assert.deepEqual(sendAs, [
    { address: INFO, name: "Ahtapot Tıbbi Teknolojiler", shared: true },
    { address: `mustafa@${DOMAIN}`, name: "Mustafa", shared: false },
  ]);
});

test("anahtarı olmayan adres için ilk anahtar üretilir", async () => {
  const fixture = base();
  fixture.keys = [];
  const { deps, state } = fakeDeps(fixture);
  const issued = await issueKey(deps, "kerem");

  assert.equal(issued.renewed, false);
  assert.deepEqual(state.calls, ["createKey"]);
});
