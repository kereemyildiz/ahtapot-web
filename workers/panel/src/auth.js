import { UserError } from "./errors.js";

const SESSION_COOKIE = "__Host-panel-oturum";
const STATE_COOKIE = "__Host-panel-durum";
const SESSION_HOURS = 12;
const STATE_MINUTES = 10;

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(text) {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function hmacKey(env) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function parseCookies(request) {
  const cookies = new Map();
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0) cookies.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return cookies;
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function isAllowed(env, email) {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function sessionCookie(env, email, now = Date.now()) {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ email, expires: now + SESSION_HOURS * 3_600_000 })),
  );
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(env), encoder.encode(payload));
  return cookie(SESSION_COOKIE, `${payload}.${toBase64Url(new Uint8Array(signature))}`, SESSION_HOURS * 3600);
}

export function clearSessionCookie() {
  return cookie(SESSION_COOKIE, "", 0);
}

export async function readSession(env, request, now = Date.now()) {
  const value = parseCookies(request).get(SESSION_COOKIE);
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    // Yetkisi kaldırılan adresin açık oturumu da geçersiz olur.
    if (session.expires <= now || !isAllowed(env, session.email)) return null;
    return session;
  } catch {
    return null;
  }
}

function redirectUri(request) {
  return `${new URL(request.url).origin}/auth/callback`;
}

export function startGoogleLogin(env, request) {
  const state = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  }).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": cookie(STATE_COOKIE, state, STATE_MINUTES * 60),
      "Cache-Control": "no-store",
    },
  });
}

function decodeIdToken(idToken) {
  const payload = idToken.split(".")[1];
  return JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
}

// id_token doğrudan Google'dan TLS ile alındığı için imzası ayrıca doğrulanmaz
// (OpenID Connect Core 3.1.3.7); alanları kontrol edilir.
export async function finishGoogleLogin(env, request, now = Date.now()) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = parseCookies(request).get(STATE_COOKIE);

  if (!code || !state || !expected || state !== expected) {
    throw new UserError("Giriş süresi doldu, yeniden deneyin.");
  }

  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id_token) {
    console.error("Google token hatası:", response.status, body?.error);
    throw new UserError("Google girişi tamamlanamadı, yeniden deneyin.", 502);
  }

  const claims = decodeIdToken(body.id_token);
  const issuerOk = GOOGLE_ISSUERS.includes(claims.iss);
  const audienceOk = claims.aud === env.GOOGLE_CLIENT_ID;
  const fresh = claims.exp * 1000 > now;
  if (!issuerOk || !audienceOk || !fresh || claims.email_verified !== true || !claims.email) {
    throw new UserError("Google girişi doğrulanamadı.", 403);
  }
  if (!isAllowed(env, claims.email)) {
    throw new UserError("Bu Google hesabının panele erişimi yok.", 403);
  }
  return claims.email.toLowerCase();
}

export function clearStateCookie() {
  return cookie(STATE_COOKIE, "", 0);
}
