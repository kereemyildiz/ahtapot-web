import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { sessionCookie } from "../src/auth.js";
import app from "../src/index.js";
import { createResend } from "../src/resend.js";
import { parseNewAddress, parseRecipient } from "../src/validate.js";
import { escapeHtml, gmailInstructions } from "../src/views.js";
import { DOMAIN, memoryKv, ROUTER, rule } from "./fakes.js";

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
    ROUTER_WORKER: ROUTER,
    SESSION_SECRET: "test-secret",
    PANEL_KV: memoryKv({
      "adres-hedefleri": JSON.stringify({ [`info@${DOMAIN}`]: ["kerem@gmail.com", "m@gmail.com"] }),
    }),
    ...overrides,
  };
}

function stubApis(rules = []) {
  mock.method(globalThis, "fetch", async (url) => {
    const path = String(url);
    if (path.includes("api.resend.com/api-keys")) {
      return Response.json({ data: [{ id: "k1", name: "gmail-kerem", last_used_at: "2026-11-04T10:00:00Z" }] });
    }
    if (path.includes("api.resend.com/emails")) {
      const created_at = new Date().toISOString().replace("T", " ").replace("Z", "000+00");
      return Response.json({
        has_more: false,
        data: [{ id: "e1", created_at, to: ["a@b.co", "c@d.co"], cc: null, bcc: null }],
      });
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
    new Request(`${ORIGIN}/adres/kerem/sil`, { method: "POST", headers: { Origin: ORIGIN } }),
    makeEnv(),
  );
  assert.equal(response.status, 303);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("eksik yapılandırmada panel kapalı kalır", async () => {
  const response = await app.fetch(new Request(`${ORIGIN}/`), makeEnv({ SESSION_SECRET: "" }));
  assert.equal(response.status, 503);
});

test("panel tüm adresleri, alıcıları ve kotayı gösterir", async () => {
  stubApis([rule("r1", "kerem", "kerem@gmail.com", "Kerem"), rule("r2", "info", null)]);
  const response = await authed("/");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.ok(body.includes(">kerem<span>@ahtapot.ink"));
  assert.ok(body.includes(">info<span>@ahtapot.ink"));
  assert.ok(body.includes("m@gmail.com"));
  assert.ok(body.includes("2 <span>/ 100</span>"));
  assert.ok(body.includes("2 <span>/ 3.000</span>"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.match(response.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
});

test("kullanım bu ayla sınırlı, gün UTC'ye göre ve her alıcı ayrı sayılır", async () => {
  const now = new Date("2026-11-05T12:00:00Z");
  mock.method(globalThis, "fetch", async () =>
    Response.json({
      has_more: true,
      data: [
        { id: "1", created_at: "2026-11-05 09:00:00.123456+00", to: ["a"], cc: ["b"], bcc: ["c"] },
        { id: "2", created_at: "2026-11-04 23:00:00.1+00", to: ["a"], cc: null, bcc: null },
        { id: "3", created_at: "2026-10-31 23:00:00.000000+00", to: ["a"], cc: null, bcc: null },
      ],
    }),
  );
  const usage = await createResend(makeEnv()).usage(now);
  assert.deepEqual(usage, { daily: 3, monthly: 4 });
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});

test("kullanım sonraki sayfalardan da okunur", async () => {
  const now = new Date("2026-11-05T12:00:00Z");
  const fetchMock = mock.method(globalThis, "fetch", async (url) => {
    const first = !String(url).includes("after=");
    return Response.json({
      has_more: first,
      data: [{ id: first ? "1" : "2", created_at: "2026-11-05 09:00:00.0+00", to: ["a"] }],
    });
  });
  assert.deepEqual(await createResend(makeEnv()).usage(now), { daily: 2, monthly: 2 });
  assert.ok(String(fetchMock.mock.calls[1].arguments[0]).includes("after=1"));
});

test("kişi adı kaçırılarak yazılır", async () => {
  stubApis([rule("r1", "kerem", "kerem@gmail.com", "<script>alert(1)</script>")]);
  const body = await (await authed("/")).text();

  assert.equal(body.includes("<script>alert(1)"), false);
  assert.ok(body.includes("&lt;script&gt;alert(1)"));
});

test("Origin başlığı olmayan veya yabancı POST reddedilir", async () => {
  stubApis();
  const missing = await authed("/adres/kerem/sil", { method: "POST" });
  const foreign = await authed("/adres/kerem/sil", {
    method: "POST",
    headers: { Origin: "https://evil.example" },
  });

  assert.equal(missing.status, 403);
  assert.equal(foreign.status, 403);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("aynı kökenden POST kabul edilir ve tarayıcı Origin yollayabilir", async () => {
  stubApis();
  const response = await authed("/cikis", { method: "POST", headers: { Origin: ORIGIN } });

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Referrer-Policy"), "same-origin");
});

test("korunan adresin silme onayı açılmaz", async () => {
  stubApis([rule("r1", "talep", "kerem@gmail.com")]);
  const response = await authed("/adres/talep/sil");
  assert.equal(response.status, 400);
});

test("geçersiz yol 404 döner", async () => {
  stubApis();
  assert.equal((await authed("/yok")).status, 404);
  assert.equal((await authed("/adres/kerem/alici")).status, 404);
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

const valid = { name: " Ahmet Yılmaz ", local: "Ahmet.Yilmaz", gmail: "Ahmet@Gmail.com" };

test("form alanları temizlenir", () => {
  assert.deepEqual(parseNewAddress(form(valid), DOMAIN), {
    name: "Ahmet Yılmaz",
    local: "ahmet.yilmaz",
    gmail: "ahmet@gmail.com",
  });
  assert.equal(parseRecipient(form({ gmail: " A@B.co " }), DOMAIN), "a@b.co");
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
    assert.throws(() => parseNewAddress(form({ ...valid, ...change }), DOMAIN));
  });
}

const issued = {
  address: `ahmet@${DOMAIN}`,
  token: "re_abc",
  sendAs: [
    { address: `ahmet@${DOMAIN}`, name: "Ahmet", shared: false },
    { address: `info@${DOMAIN}`, name: "Ahtapot Tıbbi Teknolojiler", shared: true },
  ],
};

test("talimat SMTP bilgilerini, anahtarı ve diğer adresleri içerir", () => {
  const text = gmailInstructions(issued);
  assert.ok(text.includes("smtp.resend.com"));
  assert.ok(text.includes("Şifre: re_abc"));
  assert.ok(text.includes(`E-posta adresi: info@${DOMAIN}`));
  assert.ok(text.includes("işaretini kaldırın"));
});

test("tek adresli kişinin talimatında başka adres yok", () => {
  const text = gmailInstructions({ ...issued, sendAs: issued.sendAs.slice(0, 1) });
  assert.equal(text.includes(`info@${DOMAIN}`), false);
});

test("HTML kaçırma tırnakları da kapsar", () => {
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});
