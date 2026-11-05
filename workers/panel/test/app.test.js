import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { sessionCookie } from "../src/auth.js";
import app from "../src/index.js";
import { parseNewPerson } from "../src/validate.js";
import { escapeHtml, gmailInstructions } from "../src/views.js";
import { DOMAIN, memoryKv, rule } from "./fakes.js";

const ORIGIN = "https://admin.ahtapot.ink";

function makeEnv(overrides = {}) {
  return {
    ADMIN_EMAILS: "kerem@gmail.com",
    CF_ACCOUNT_ID: "hesap",
    CF_API_TOKEN: "cf",
    CF_ZONE_ID: "alan",
    DOMAIN,
    GOOGLE_CLIENT_ID: "client",
    GOOGLE_CLIENT_SECRET: "secret",
    RESEND_API_KEY: "re",
    RESEND_DAILY_LIMIT: "100",
    RESEND_MONTHLY_LIMIT: "3000",
    SESSION_SECRET: "test-secret",
    PANEL_KV: memoryKv({ "info-hedefleri": JSON.stringify(["kerem@gmail.com"]) }),
    ...overrides,
  };
}

function stubApis(rules = []) {
  mock.method(globalThis, "fetch", async (url) => {
    const path = String(url);
    if (path.includes("api.resend.com")) {
      return Response.json(
        { data: [{ id: "k1", name: "gmail-kerem", last_used_at: "2026-11-04T10:00:00Z" }] },
        { headers: { "x-resend-daily-quota": "7", "x-resend-monthly-quota": "120" } },
      );
    }
    if (path.includes("/email/routing/rules")) return Response.json({ success: true, result: rules });
    return Response.json({ success: true, result: [] });
  });
}

async function authed(path, init = {}, env = makeEnv()) {
  const cookie = (await sessionCookie(env, "kerem@gmail.com")).split(";")[0];
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookie);
  return app.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), env);
}

beforeEach(() => mock.method(console, "error", () => {}));
afterEach(() => mock.restoreAll());

test("oturumsuz ziyaret girişe yönlenir ve veriye dokunmaz", async () => {
  stubApis();
  const response = await app.fetch(new Request(`${ORIGIN}/`), makeEnv());

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), "/giris");
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("oturumsuz POST da girişe yönlenir", async () => {
  stubApis();
  const response = await app.fetch(
    new Request(`${ORIGIN}/kisi/kerem/cikar`, { method: "POST", headers: { Origin: ORIGIN } }),
    makeEnv(),
  );
  assert.equal(response.status, 303);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("eksik yapılandırmada panel kapalı kalır", async () => {
  const response = await app.fetch(new Request(`${ORIGIN}/`), makeEnv({ SESSION_SECRET: "" }));
  assert.equal(response.status, 503);
});

test("panel kişileri ve kotayı gösterir", async () => {
  stubApis([rule("r1", "kerem", "kerem@gmail.com", "Kerem"), rule("r2", "info", null)]);
  const response = await authed("/");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.ok(body.includes("kerem@ahtapot.ink"));
  assert.ok(body.includes("7 / 100"));
  assert.ok(body.includes("120 / 3.000"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.match(response.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
});

test("kişi adı kaçırılarak yazılır", async () => {
  stubApis([rule("r1", "kerem", "kerem@gmail.com", "<script>alert(1)</script>")]);
  const body = await (await authed("/")).text();

  assert.equal(body.includes("<script>alert(1)"), false);
  assert.ok(body.includes("&lt;script&gt;alert(1)"));
});

test("Origin başlığı olmayan veya yabancı POST reddedilir", async () => {
  stubApis();
  const missing = await authed("/kisi/kerem/cikar", { method: "POST" });
  const foreign = await authed("/kisi/kerem/cikar", {
    method: "POST",
    headers: { Origin: "https://evil.example" },
  });

  assert.equal(missing.status, 403);
  assert.equal(foreign.status, 403);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("sistem adresinin çıkarma onayı açılmaz", async () => {
  stubApis([rule("r1", "talep", "kerem@gmail.com")]);
  const response = await authed("/kisi/talep/cikar");
  assert.equal(response.status, 404);
});

test("geçersiz yol 404 döner", async () => {
  stubApis();
  assert.equal((await authed("/yok")).status, 404);
  assert.equal((await authed("/kisi/kerem/tamamla")).status, 404);
});

test("servis hatası yön veren bir hata sayfasına döner", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({ success: false, errors: [{ message: "izin yok" }] }, { status: 403 }),
  );
  const response = await authed("/");
  assert.equal(response.status, 502);
  assert.ok((await response.text()).includes("izin yok"));
});

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = { name: " Ahmet Yılmaz ", local: "Ahmet.Yilmaz", gmail: "Ahmet@Gmail.com", info: "on" };

test("form alanları temizlenir", () => {
  assert.deepEqual(parseNewPerson(form(valid), DOMAIN), {
    name: "Ahmet Yılmaz",
    local: "ahmet.yilmaz",
    gmail: "ahmet@gmail.com",
    info: true,
  });
});

for (const [label, change] of [
  ["Türkçe karakter", { local: "ahmet.yılmaz" }],
  ["boşluk", { local: "ahmet yilmaz" }],
  ["baştaki nokta", { local: ".ahmet" }],
  ["çift nokta", { local: "ahmet..yilmaz" }],
  ["çok uzun adres", { local: "a".repeat(41) }],
  ["ayrılmış ad", { local: "info" }],
  ["ayrılmış ad admin", { local: "admin" }],
  ["boş ad", { name: "  " }],
  ["bozuk Gmail", { gmail: "ahmet" }],
  ["kendi alan adına yönlendirme", { gmail: `kerem@${DOMAIN}` }],
]) {
  test(`form reddeder: ${label}`, () => {
    assert.throws(() => parseNewPerson(form({ ...valid, ...change }), DOMAIN));
  });
}

test("talimat SMTP bilgilerini ve anahtarı içerir", () => {
  const text = gmailInstructions({
    name: "Ahmet",
    address: `ahmet@${DOMAIN}`,
    token: "re_abc",
    info: true,
    domain: DOMAIN,
  });
  assert.ok(text.includes("smtp.resend.com"));
  assert.ok(text.includes("Şifre: re_abc"));
  assert.ok(text.includes(`info@${DOMAIN}`));
});

test("info@ almayan kişinin talimatında info@ adımı yok", () => {
  const text = gmailInstructions({
    name: "Ahmet",
    address: `ahmet@${DOMAIN}`,
    token: "re_abc",
    info: false,
    domain: DOMAIN,
  });
  assert.equal(text.includes(`info@${DOMAIN}`), false);
});

test("HTML kaçırma tırnakları da kapsar", () => {
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});
