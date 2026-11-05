import assert from "node:assert/strict";
import { test } from "node:test";
import { UserError } from "../src/errors.js";
import {
  addPerson,
  cancelPending,
  completePerson,
  loadOverview,
  removePerson,
  rotateKey,
  setInfoRecipient,
} from "../src/people.js";
import { DOMAIN, fakeDeps, rule } from "./fakes.js";

const KEREM = "kerem@gmail.com";
const MUSTAFA = "mustafa@gmail.com";
const AHMET = "ahmet@gmail.com";

const base = () => ({
  rules: [
    rule("info", "info", null),
    rule("talep", "talep", KEREM),
    rule("kerem", "kerem", KEREM),
    rule("mustafa", "mustafa", MUSTAFA),
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
  info: [KEREM, MUSTAFA],
});

const newPerson = { name: "Ahmet Yılmaz", local: "ahmet.yilmaz", gmail: AHMET, info: true };

test("genel görünüm kişileri sistem adreslerinden ayırır", async () => {
  const { deps } = fakeDeps(base());
  const overview = await loadOverview(deps);

  assert.deepEqual(overview.people.map((person) => person.local), ["kerem", "mustafa"]);
  assert.deepEqual(overview.system.map((item) => item.local), ["info", "talep"]);
  assert.equal(overview.people[0].key.id, "k-kerem");
  assert.equal(overview.people[0].inInfo, true);
  assert.equal(overview.people[0].name, "kerem");
});

test("ekleme hedef adresi açar ve kişiyi bekletir", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, newPerson);

  assert.deepEqual(state.calls, ["createAddress"]);
  assert.equal(state.pending[0].local, "ahmet.yilmaz");
  assert.equal(state.rules.length, 4);
});

test("doğrulanmış Gmail için ikinci adres yeni hedef açmaz", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, { ...newPerson, gmail: KEREM });
  assert.deepEqual(state.calls, []);
});

test("var olan ya da bekleyen adres yeniden eklenemez", async () => {
  const { deps } = fakeDeps(base());
  await assert.rejects(addPerson(deps, { ...newPerson, local: "kerem" }), UserError);

  await addPerson(deps, newPerson);
  await assert.rejects(addPerson(deps, newPerson), UserError);
});

test("doğrulanmamış kişi tamamlanamaz", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, newPerson);

  await assert.rejects(completePerson(deps, "ahmet.yilmaz"), /henüz doğrulanmadı/);
  assert.equal(state.rules.length, 4);
  assert.equal(state.pending.length, 1);
});

test("tamamlama kuralı, info@ alıcısını ve anahtarı oluşturur", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, newPerson);
  state.addresses.find((item) => item.email === AHMET).verified = "2026-11-05";

  const result = await completePerson(deps, "ahmet.yilmaz");

  assert.equal(result.token, "re_token_gmail-ahmet.yilmaz");
  assert.equal(result.address, `ahmet.yilmaz@${DOMAIN}`);
  assert.ok(state.info.includes(AHMET));
  assert.equal(state.pending.length, 0);
  assert.equal(state.rules.at(-1).name, "Ahmet Yılmaz");
});

test("yarıda kalan tamamlama tekrarında kural ve anahtar çoğalmaz", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, newPerson);
  state.addresses.find((item) => item.email === AHMET).verified = "2026-11-05";

  const setPending = deps.store.setPending;
  deps.store.setPending = async () => {
    throw new Error("KV");
  };
  await assert.rejects(completePerson(deps, "ahmet.yilmaz"));
  deps.store.setPending = setPending;

  const result = await completePerson(deps, "ahmet.yilmaz");
  assert.equal(result.token, null);
  assert.equal(state.calls.filter((call) => call === "createRule").length, 1);
  assert.equal(state.calls.filter((call) => call === "createKey").length, 1);
  assert.equal(state.info.filter((gmail) => gmail === AHMET).length, 1);
});

test("iptal kullanılmayan hedef adresi siler", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, newPerson);
  await cancelPending(deps, "ahmet.yilmaz");

  assert.equal(state.pending.length, 0);
  assert.equal(state.addresses.some((item) => item.email === AHMET), false);
});

test("iptal başka yerde kullanılan hedef adresi silmez", async () => {
  const { deps, state } = fakeDeps(base());
  await addPerson(deps, { ...newPerson, gmail: KEREM });
  await cancelPending(deps, "ahmet.yilmaz");
  assert.ok(state.addresses.some((item) => item.email === KEREM));
});

test("çıkarma anahtarı, kuralı, info@ alıcısını ve hedef adresi kaldırır", async () => {
  const { deps, state } = fakeDeps(base());
  await removePerson(deps, "mustafa");

  assert.equal(state.rules.some((item) => item.id === "mustafa"), false);
  assert.equal(state.keys.some((item) => item.id === "k-mustafa"), false);
  assert.deepEqual(state.info, [KEREM]);
  assert.equal(state.addresses.some((item) => item.email === MUSTAFA), false);
});

test("başka kuralda kullanılan Gmail çıkarmada korunur", async () => {
  const { deps, state } = fakeDeps(base());
  await removePerson(deps, "kerem");

  assert.equal(state.rules.some((item) => item.id === "kerem"), false);
  assert.ok(state.rules.some((item) => item.id === "talep"));
  assert.ok(state.info.includes(KEREM));
  assert.ok(state.addresses.some((item) => item.email === KEREM));
});

test("sistem adresleri çıkarılamaz", async () => {
  const { deps, state } = fakeDeps(base());
  await assert.rejects(removePerson(deps, "talep"), UserError);
  await assert.rejects(removePerson(deps, "info"), UserError);
  assert.equal(state.rules.length, 4);
});

test("info@ listesinin son alıcısı çıkarılamaz", async () => {
  const fixture = base();
  fixture.info = [MUSTAFA];
  const { deps, state } = fakeDeps(fixture);

  await assert.rejects(removePerson(deps, "mustafa"), /son alıcısı/);
  await assert.rejects(setInfoRecipient(deps, "mustafa", false), /son alıcısı/);
  assert.deepEqual(state.info, [MUSTAFA]);
  assert.ok(state.keys.some((item) => item.id === "k-mustafa"));
});

test("info@ alıcılığı açılıp kapanır", async () => {
  const fixture = base();
  fixture.info = [KEREM];
  const { deps, state } = fakeDeps(fixture);

  await setInfoRecipient(deps, "mustafa", true);
  assert.deepEqual(state.info, [KEREM, MUSTAFA]);
  await setInfoRecipient(deps, "mustafa", false);
  assert.deepEqual(state.info, [KEREM]);
});

test("anahtar yenileme önce yenisini üretir, sonra eskisini siler", async () => {
  const { deps, state } = fakeDeps(base());
  const result = await rotateKey(deps, "mustafa");

  assert.equal(result.token, "re_token_gmail-mustafa");
  assert.equal(result.info, true);
  assert.deepEqual(state.calls, ["createKey", "deleteKey"]);
  assert.equal(state.keys.filter((item) => item.name === "gmail-mustafa").length, 1);
  assert.notEqual(state.keys.find((item) => item.name === "gmail-mustafa").id, "k-mustafa");
  assert.ok(state.keys.some((item) => item.id === "k-form"));
});
