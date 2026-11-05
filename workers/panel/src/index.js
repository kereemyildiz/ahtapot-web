import {
  addAddress,
  addRecipient,
  applyVerifiedPending,
  deleteAddress,
  findAddress,
  issueKey,
  loadOverview,
  removeRecipient,
} from "./addresses.js";
import { CSS, SCRIPT } from "./assets.js";
import {
  clearSessionCookie,
  clearStateCookie,
  finishGoogleLogin,
  readSession,
  sessionCookie,
  startGoogleLogin,
} from "./auth.js";
import { createCloudflare } from "./cloudflare.js";
import { UserError } from "./errors.js";
import { createResend, quotaPeriod } from "./resend.js";
import { createStore } from "./store.js";
import { isValidLocal, parseNewAddress, parseRecipient, PROTECTED_ADDRESSES } from "./validate.js";
import { confirmPage, dashboardPage, errorPage, loginPage, setupPage } from "./views.js";

const REQUIRED_ENV = [
  "ADMIN_EMAILS",
  "CF_ACCOUNT_ID",
  "CF_API_TOKEN",
  "CF_ZONE_ID",
  "DOMAIN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_CYCLE_DAY",
  "ROUTER_WORKER",
  "SESSION_SECRET",
];

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  // no-referrer olmaz: tarayıcı formlarda Origin'i "null" yollar ve POST kontrolü reddeder.
  "Referrer-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const ADDRESS_PATH = /^\/adres\/([a-z0-9._-]+)\/(alici\/cikar|alici|sil|anahtar)$/;

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: { ...SECURITY_HEADERS, "Content-Type": "text/html; charset=utf-8", ...extraHeaders },
  });
}

function redirect(location, extraHeaders = {}) {
  return new Response(null, {
    status: 303,
    headers: { ...SECURITY_HEADERS, Location: location, ...extraHeaders },
  });
}

function asset(body, type) {
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handleLogin(request, env, url) {
  if (url.pathname === "/auth/google") return startGoogleLogin(env, request);

  try {
    const email = await finishGoogleLogin(env, request);
    const headers = new Headers({ ...SECURITY_HEADERS, Location: "/" });
    headers.append("Set-Cookie", await sessionCookie(env, email));
    headers.append("Set-Cookie", clearStateCookie());
    return new Response(null, { status: 303, headers });
  } catch (error) {
    if (!(error instanceof UserError)) throw error;
    return html(loginPage(error.message), error.status, { "Set-Cookie": clearStateCookie() });
  }
}

async function confirmFor(action, deps, local, email) {
  if (action === "sil") {
    if (PROTECTED_ADDRESSES[local]) {
      throw new UserError(`${local}@${deps.domain} silinemez: ${PROTECTED_ADDRESSES[local]}.`);
    }
    return confirmPage({
      email,
      title: `${local}@${deps.domain} silinsin mi?`,
      text: "Bu adrese gelen mailler artık iletilmez ve adresin anahtarı iptal edilir. Aynı adres yeniden açılabilir.",
      action: `/adres/${local}/sil`,
      button: "Adresi silin",
    });
  }

  const { address } = await findAddress(deps, local);
  return confirmPage({
    email,
    title: `${address} anahtarı yenilensin mi?`,
    text: "Eski anahtar iptal edilir. Kişi Gmail'deki şifreyi yenisiyle değiştirene kadar bu anahtarla gönderemez.",
    action: `/adres/${local}/anahtar`,
    button: "Anahtarı yenileyin",
  });
}

async function handleAddress(request, deps, env, email, local, action) {
  const domain = env.DOMAIN;

  if (request.method === "GET") {
    if (action !== "sil" && action !== "anahtar") return null;
    return html(await confirmFor(action, deps, local, email));
  }

  switch (action) {
    case "alici": {
      const form = await request.formData();
      const result = await addRecipient(deps, local, parseRecipient(form, domain));
      return redirect(`/?ok=${result}`);
    }
    case "alici/cikar": {
      const form = await request.formData();
      await removeRecipient(deps, local, parseRecipient(form, domain));
      return redirect("/?ok=alici_cikti");
    }
    case "sil":
      await deleteAddress(deps, local);
      return redirect("/?ok=silindi");
    case "anahtar":
      return html(setupPage({ email, issued: await issueKey(deps, local) }));
    default:
      return null;
  }
}

async function handlePanel(request, env, url, session) {
  const deps = {
    cf: createCloudflare(env),
    resend: createResend(env),
    store: createStore(env.PANEL_KV),
    actor: session.email,
    domain: env.DOMAIN,
    routerWorker: env.ROUTER_WORKER,
  };
  const { pathname } = url;

  if (request.method === "POST" && request.headers.get("Origin") !== url.origin) {
    return html(errorPage({ email: session.email, message: "İstek reddedildi." }), 403);
  }

  if (request.method === "GET" && pathname === "/") {
    await applyVerifiedPending(deps);
    const limits = {
      daily: Number(env.RESEND_DAILY_LIMIT),
      monthly: Number(env.RESEND_MONTHLY_LIMIT),
      period: quotaPeriod(new Date(), Number(env.RESEND_CYCLE_DAY)),
    };
    return html(
      dashboardPage({
        overview: await loadOverview(deps),
        email: session.email,
        limits,
        ok: url.searchParams.get("ok"),
      }),
    );
  }

  if (request.method === "POST" && pathname === "/cikis") {
    return redirect("/giris", { "Set-Cookie": clearSessionCookie() });
  }

  if (request.method === "POST" && pathname === "/adres") {
    const result = await addAddress(deps, parseNewAddress(await request.formData(), env.DOMAIN));
    return redirect(`/?ok=${result}`);
  }

  const match = pathname.match(ADDRESS_PATH);
  if (match && isValidLocal(match[1])) {
    const response = await handleAddress(request, deps, env, session.email, match[1], match[2]);
    if (response) return response;
  }

  return html(errorPage({ email: session.email, message: "Sayfa bulunamadı." }), 404);
}

async function route(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/stil.css") return asset(CSS, "text/css; charset=utf-8");
  if (pathname === "/panel.js") return asset(SCRIPT, "text/javascript; charset=utf-8");
  if (pathname === "/robots.txt") {
    return asset("User-agent: *\nDisallow: /\n", "text/plain; charset=utf-8");
  }

  // Yapılandırma eksikse panel kapalı kalır: boş SESSION_SECRET ile oturum imzalanmamalı.
  if (REQUIRED_ENV.some((name) => !env[name])) {
    return html(errorPage({ message: "Panel henüz yapılandırılmadı." }), 503);
  }

  if (pathname === "/auth/google" || pathname === "/auth/callback") {
    return handleLogin(request, env, url);
  }

  const session = await readSession(env, request);
  if (pathname === "/giris") return session ? redirect("/") : html(loginPage());
  if (!session) return redirect("/giris");

  try {
    return await handlePanel(request, env, url, session);
  } catch (error) {
    if (!error.status) throw error;
    return html(errorPage({ email: session.email, message: error.message }), error.status);
  }
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error("Panel hatası:", error);
      return html(errorPage({ message: "Beklenmeyen bir hata oldu, yeniden deneyin." }), 500);
    }
  },
};
