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
import {
  addPerson,
  cancelPending,
  completePerson,
  findPersonForConfirm,
  loadOverview,
  removePerson,
  rotateKey,
  setInfoRecipient,
} from "./people.js";
import { createResend } from "./resend.js";
import { createStore } from "./store.js";
import { isValidLocal, parseNewPerson } from "./validate.js";
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
  "SESSION_SECRET",
];

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const PERSON_PATH = /^\/kisi\/([a-z0-9._-]+)\/(tamamla|iptal|cikar|anahtar|info)$/;

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
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
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

function confirmFor(action, person, email) {
  const path = `/kisi/${person.local}/${action}`;
  if (action === "cikar") {
    return confirmPage({
      email,
      title: `${person.address} çıkarılsın mı?`,
      text: "Adres kapanır ve kişinin anahtarı iptal edilir. Bu adrese gelen mailler artık iletilmez. Bu işlem geri alınamaz; aynı adres yeniden eklenebilir.",
      action: path,
      button: "Kişiyi çıkarın",
    });
  }
  return confirmPage({
    email,
    title: `${person.address} anahtarı yenilensin mi?`,
    text: "Eski anahtar iptal edilir. Kişi Gmail'deki şifreyi yenisiyle değiştirene kadar bu adresten gönderemez.",
    action: path,
    button: "Anahtarı yenileyin",
  });
}

async function handlePerson(request, deps, env, session, local, action) {
  const email = session.email;
  const domain = env.DOMAIN;

  if (request.method === "GET") {
    if (action !== "cikar" && action !== "anahtar") return null;
    return html(confirmFor(action, await findPersonForConfirm(deps, local), email));
  }

  switch (action) {
    case "tamamla":
      return html(setupPage({ email, domain, person: await completePerson(deps, local) }));
    case "iptal":
      await cancelPending(deps, local);
      return redirect("/?ok=iptal");
    case "cikar":
      await removePerson(deps, local);
      return redirect("/?ok=cikarildi");
    case "anahtar":
      return html(setupPage({ email, domain, person: await rotateKey(deps, local), renewed: true }));
    case "info": {
      const form = await request.formData();
      await setInfoRecipient(deps, local, form.get("durum") === "ac");
      return redirect("/?ok=info");
    }
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
  };
  const { pathname } = url;

  if (request.method === "POST" && request.headers.get("Origin") !== url.origin) {
    return html(errorPage({ email: session.email, message: "İstek reddedildi." }), 403);
  }

  if (request.method === "GET" && pathname === "/") {
    const overview = await loadOverview(deps);
    const limits = { daily: Number(env.RESEND_DAILY_LIMIT), monthly: Number(env.RESEND_MONTHLY_LIMIT) };
    return html(
      dashboardPage({
        overview,
        email: session.email,
        domain: env.DOMAIN,
        limits,
        ok: url.searchParams.get("ok"),
      }),
    );
  }

  if (request.method === "POST" && pathname === "/cikis") {
    return redirect("/giris", { "Set-Cookie": clearSessionCookie() });
  }

  if (request.method === "POST" && pathname === "/kisi") {
    await addPerson(deps, parseNewPerson(await request.formData(), env.DOMAIN));
    return redirect("/?ok=eklendi");
  }

  const match = pathname.match(PERSON_PATH);
  if (match && isValidLocal(match[1])) {
    const response = await handlePerson(request, deps, env, session, match[1], match[2]);
    if (response) return response;
  }

  return html(errorPage({ email: session.email, message: "Sayfa bulunamadı." }), 404);
}

async function route(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/stil.css") return asset(CSS, "text/css; charset=utf-8");
  if (pathname === "/panel.js") return asset(SCRIPT, "text/javascript; charset=utf-8");
  if (pathname === "/robots.txt") return asset("User-agent: *\nDisallow: /\n", "text/plain; charset=utf-8");

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
