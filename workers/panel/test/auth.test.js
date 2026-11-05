import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { finishGoogleLogin, isAllowed, readSession, sessionCookie, startGoogleLogin } from "../src/auth.js";

const env = {
  ADMIN_EMAILS: "Kerem@gmail.com, mustafa@gmail.com",
  GOOGLE_CLIENT_ID: "client",
  GOOGLE_CLIENT_SECRET: "secret",
  SESSION_SECRET: "test-secret",
};

const NOW = 1_800_000_000_000;

afterEach(() => mock.restoreAll());

function withCookie(cookie, url = "https://admin.ahtapot.ink/") {
  return new Request(url, { headers: { Cookie: cookie.split(";")[0] } });
}

function idToken(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(claims)}.imza`;
}

const goodClaims = {
  iss: "https://accounts.google.com",
  aud: "client",
  exp: NOW / 1000 + 600,
  email: "kerem@gmail.com",
  email_verified: true,
};

function stubGoogle(claims) {
  mock.method(globalThis, "fetch", async () =>
    Response.json({ id_token: idToken(claims) }),
  );
}

const callback = (state = "durum", cookieState = "durum") =>
  new Request(`https://admin.ahtapot.ink/auth/callback?code=kod&state=${state}`, {
    headers: { Cookie: `__Host-panel-durum=${cookieState}` },
  });

test("izinli adres büyük küçük harf ve boşluktan etkilenmez", () => {
  assert.equal(isAllowed(env, "kerem@gmail.com"), true);
  assert.equal(isAllowed(env, "MUSTAFA@gmail.com"), true);
  assert.equal(isAllowed(env, "baska@gmail.com"), false);
  assert.equal(isAllowed({}, "kerem@gmail.com"), false);
});

test("oturum çerezi okunur", async () => {
  const cookie = await sessionCookie(env, "kerem@gmail.com", NOW);
  const session = await readSession(env, withCookie(cookie), NOW);
  assert.equal(session.email, "kerem@gmail.com");
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(cookie, /^__Host-/);
});

test("süresi dolan oturum geçersiz", async () => {
  const cookie = await sessionCookie(env, "kerem@gmail.com", NOW);
  const later = NOW + 12 * 3_600_000 + 1;
  assert.equal(await readSession(env, withCookie(cookie), later), null);
});

test("değiştirilmiş oturum geçersiz", async () => {
  const cookie = await sessionCookie(env, "kerem@gmail.com", NOW);
  const [value] = cookie.split(";");
  const [name, token] = value.split(/=(.*)/s);
  const signature = token.split(".")[1];
  const forged = Buffer.from(
    JSON.stringify({ email: "mustafa@gmail.com", expires: NOW + 1000 }),
  ).toString("base64url");
  assert.equal(await readSession(env, withCookie(`${name}=${forged}.${signature}`), NOW), null);
  assert.equal(await readSession(env, withCookie(`${name}=bozuk`), NOW), null);
});

test("başka anahtarla imzalanan oturum geçersiz", async () => {
  const cookie = await sessionCookie({ ...env, SESSION_SECRET: "baska" }, "kerem@gmail.com", NOW);
  assert.equal(await readSession(env, withCookie(cookie), NOW), null);
});

test("yetkisi kaldırılan adresin oturumu geçersiz", async () => {
  const cookie = await sessionCookie(env, "kerem@gmail.com", NOW);
  const reduced = { ...env, ADMIN_EMAILS: "mustafa@gmail.com" };
  assert.equal(await readSession(reduced, withCookie(cookie), NOW), null);
});

test("Google girişi durum çerezi ve doğru adresle başlar", () => {
  const response = startGoogleLogin(env, new Request("https://admin.ahtapot.ink/auth/google"));
  const location = new URL(response.headers.get("Location"));

  assert.equal(location.origin, "https://accounts.google.com");
  assert.equal(location.searchParams.get("redirect_uri"), "https://admin.ahtapot.ink/auth/callback");
  assert.equal(location.searchParams.get("scope"), "openid email");
  assert.ok(response.headers.get("Set-Cookie").includes(location.searchParams.get("state")));
});

test("geçerli Google yanıtı adresi döndürür", async () => {
  stubGoogle(goodClaims);
  assert.equal(await finishGoogleLogin(env, callback(), NOW), "kerem@gmail.com");
});

test("durum uyuşmazsa Google'a istek atılmaz", async () => {
  stubGoogle(goodClaims);
  await assert.rejects(finishGoogleLogin(env, callback("saldirgan"), NOW), /Giriş süresi/);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

for (const [label, claims, message] of [
  ["izinsiz adres", { ...goodClaims, email: "baska@gmail.com" }, /erişimi yok/],
  ["doğrulanmamış adres", { ...goodClaims, email_verified: false }, /doğrulanamadı/],
  ["başka uygulamanın jetonu", { ...goodClaims, aud: "baska" }, /doğrulanamadı/],
  ["yabancı yayıncı", { ...goodClaims, iss: "https://evil.example" }, /doğrulanamadı/],
  ["süresi dolmuş jeton", { ...goodClaims, exp: NOW / 1000 - 1 }, /doğrulanamadı/],
]) {
  test(`${label} reddedilir`, async () => {
    stubGoogle(claims);
    await assert.rejects(finishGoogleLogin(env, callback(), NOW), message);
  });
}
