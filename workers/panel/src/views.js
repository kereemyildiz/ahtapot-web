const LOGO_PATHS = [
  "M430 150 L618 338 L430 526 L242 338 Z",
  "M362 458 V845 H200 V730 H290 V785",
  "M498 458 V845 H660 V730 H570 V785",
  "M300 396 V640 H170 V520 H230 V565",
  "M560 396 V640 H690 V520 H630 V565",
];

const LOGO = `<svg class="logo" viewBox="140 112 580 765" fill="none" stroke="#93a4f4" stroke-width="44" stroke-linecap="square" aria-hidden="true">${LOGO_PATHS.map((d) => `<path d="${d}"/>`).join("")}</svg>`;

// Site ikonlarıyla aynı dil: 24'lük ızgara, kare uç, sivri köşe.
const ICONS = {
  plus: "M12 5v14M5 12h14",
  close: "M5 5l14 14M19 5 5 19",
  check: "M4 12.5 9.5 18 20 6.5",
  warning: "M12 3 22 20H2zM12 9.5v5M12 16.5v1.5",
};

const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600&family=Onest:wght@400;500&subset=latin-ext&display=swap";

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const periodFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const number = (value) => value.toLocaleString("tr-TR");

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const esc = escapeHtml;

function page(title, body) {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/stil.css">
</head>
<body>${body}</body>
</html>`;
}

function header(email) {
  return `<header class="bar">
<a class="brand" href="/">${LOGO}Ahtapot e-posta</a>
<span class="who">${esc(email)}</span>
<form method="post" action="/cikis"><button type="submit">Çıkış yapın</button></form>
</header>`;
}

export function loginPage(message) {
  return page(
    "Giriş · Ahtapot e-posta",
    `<main class="login">${LOGO}
<h1>Ahtapot e-posta</h1>
${message ? `<p class="notice alert" role="alert">${icon("warning")}<span>${esc(message)}</span></p>` : ""}
<p>Adresleri ve alıcıları yönetmek için giriş yapın.</p>
<a class="btn primary" href="/auth/google">Google ile giriş yapın</a>
</main>`,
  );
}

const MESSAGES = {
  acildi: "Adres açıldı.",
  alici: "Alıcı eklendi. Değişiklik en çok bir dakikada geçerli olur.",
  dogrulama:
    "Alıcıya doğrulama maili gönderildi. Bağlantıya tıkladıktan sonra bu sayfayı yenileyin, alıcı kendiliğinden eklenir.",
  alici_cikti: "Alıcı çıkarıldı. Değişiklik en çok bir dakikada geçerli olur.",
  silindi: "Adres silindi.",
};

function recipientItem(row, recipient) {
  const label = `${recipient.email} alıcısını çıkarın`;
  return `<li>
<span class="email">${esc(recipient.email)}</span>
${recipient.waiting ? `<span class="waiting">${icon("warning")}Doğrulama bekleniyor</span>` : ""}
<form method="post" action="/adres/${esc(row.local)}/alici/cikar">
<input type="hidden" name="gmail" value="${esc(recipient.email)}">
<button class="remove" type="submit" aria-label="${esc(label)}" title="${esc(label)}">${icon("close")}</button>
</form>
</li>`;
}

function addressRow(row, domain) {
  const local = esc(row.local);
  const keyLine = row.key
    ? `<strong>Anahtar var</strong>${
        row.key.last_used_at
          ? `<span>Son kullanım ${esc(dateFormat.format(new Date(row.key.last_used_at)))}</span>`
          : "<span>Henüz kullanılmadı</span>"
      }`
    : row.sendsWithRecipientKeys
      ? "<strong>Alıcıların anahtarıyla</strong>"
      : "<strong>Anahtar yok</strong>";

  const keyAction = !row.id
    ? ""
    : row.key
      ? `<a class="btn link" href="/adres/${local}/anahtar">Anahtarı yenileyin</a>`
      : `<form method="post" action="/adres/${local}/anahtar"><button class="link" type="submit">Anahtar üretin</button></form>`;

  return `<tr>
<td>
<div class="address">${local}<span>@${esc(domain)}</span></div>
${row.name ? `<div class="owner">${esc(row.name)}</div>` : ""}
</td>
<td>
<ul class="arms">
${row.recipients.map((recipient) => recipientItem(row, recipient)).join("")}
<li><details class="add-recipient">
<summary>${icon("plus")}Alıcı ekleyin</summary>
<form method="post" action="/adres/${local}/alici">
<label class="visually-hidden" for="alici-${local}">${local}@${esc(domain)} için alıcı</label>
<input id="alici-${local}" type="email" name="gmail" list="alicilar" required placeholder="kisi@gmail.com" autocomplete="off">
<button type="submit">Ekleyin</button>
</form>
</details></li>
</ul>
</td>
<td class="send">${keyLine}${keyAction}</td>
<td>${
    row.protectedReason
      ? `<span class="lock">${esc(row.protectedReason)}</span>`
      : `<a class="btn link danger" href="/adres/${local}/sil">Adresi silin</a>`
  }</td>
</tr>`;
}

function usageBlock(label, used, limit) {
  if (used === null) return `<div><dt>${label}</dt><dd>Okunamadı</dd></div>`;
  return `<div><dt>${label}</dt>
<dd>${number(used)} <span>/ ${number(limit)}</span></dd>
<meter min="0" max="${limit}" low="${limit * 0.8}" high="${limit * 0.8}" optimum="0" value="${Math.min(used, limit)}">${number(used)} / ${number(limit)}</meter></div>`;
}

export function dashboardPage({ overview, email, limits, ok }) {
  const { rows, domain, destinations, usage, log } = overview;
  const recipients = new Set(rows.flatMap((row) => row.recipients.map((item) => item.email)));

  return page(
    "Adresler · Ahtapot e-posta",
    `${header(email)}<div class="layout">
<main>
<div class="title-row">
<div><h1>Adresler</h1><p>${rows.length} adres, ${recipients.size} alıcı</p></div>
<details class="new-address">
<summary class="btn primary">${icon("plus")}Yeni adres</summary>
<form method="post" action="/adres">
<label>Ad soyad veya birim<input type="text" name="name" required maxlength="80" autocomplete="off"></label>
<label>Adres<span class="with-suffix"><input type="text" name="local" required maxlength="40" pattern="[a-z0-9._\\-]+" placeholder="ahmet.yilmaz" autocomplete="off" spellcheck="false" autocapitalize="none"><span>@${esc(domain)}</span></span></label>
<label>Alıcının Gmail'i<input type="email" name="gmail" list="alicilar" required autocomplete="off"></label>
<button class="primary" type="submit">Adresi açın</button>
<p class="hint">Yeni bir Gmail'e önce doğrulama maili gider. Daha fazla alıcıyı adres açıldıktan sonra ekleyebilirsiniz.</p>
</form>
</details>
</div>
${MESSAGES[ok] ? `<p class="notice" role="status">${icon("check")}<span>${MESSAGES[ok]}</span></p>` : ""}
<table>
<thead><tr><th scope="col">Adres</th><th scope="col">Nereye gider</th><th scope="col">Gönderim</th><th scope="col"><span class="visually-hidden">İşlem</span></th></tr></thead>
<tbody>${rows.map((row) => addressRow(row, domain)).join("")}</tbody>
</table>
<datalist id="alicilar">${destinations.map((item) => `<option value="${esc(item)}"></option>`).join("")}</datalist>
</main>
<aside class="rail">
<section aria-labelledby="kota">
<h2 id="kota">Giden e-posta</h2>
<dl class="usage">
${usageBlock("Bugün", usage.daily, limits.daily)}
${usageBlock(`Bu ay (${periodFormat.format(limits.period.start)} – ${periodFormat.format(limits.period.end)})`, usage.monthly, limits.monthly)}
</dl>
<p class="hint">Resend kotası. Form ve tüm kişiler ortak kullanır, her alıcı ayrı sayılır. Günlük kota 03:00'te yenilenir. Ay dönemi hesabın açıldığı güne göre hesaplanır, kesin sayı <a href="https://resend.com/settings/usage" target="_blank" rel="noreferrer">Resend'de</a>.</p>
</section>
<section aria-labelledby="kayit">
<h2 id="kayit">Son işlemler</h2>
${
  log.length
    ? `<ol class="log">${log
        .slice(0, 8)
        .map(
          (item) =>
            `<li>${esc(item.text)}<time datetime="${esc(item.at)}">${esc(dateFormat.format(new Date(item.at)))}, ${esc(item.actor)}</time></li>`,
        )
        .join("")}</ol>`
    : '<p class="muted">Henüz işlem yok.</p>'
}
</section>
</aside>
</div>`,
  );
}

export function confirmPage({ email, title, text, action, button }) {
  return page(
    `${title} · Ahtapot e-posta`,
    `${header(email)}<main class="single">
<h1>${esc(title)}</h1>
<p>${esc(text)}</p>
<div class="actions">
<form method="post" action="${esc(action)}"><button class="primary" type="submit">${esc(button)}</button></form>
<a class="btn" href="/">Vazgeçin</a>
</div>
</main>`,
  );
}

function aliasSteps({ address, name, shared }, firstStep) {
  return [
    `${firstStep}. "Postayı şu adresten gönder" satırında "Başka bir e-posta adresi ekle"ye tıklayın.`,
    `   Ad: ${name}`,
    `   E-posta adresi: ${address}`,
    shared
      ? '   "Takma ad olarak değerlendir" işaretini kaldırın. Sonraki adıma geçin.'
      : '   "Takma ad olarak değerlendir" işaretli kalsın. Sonraki adıma geçin.',
  ];
}

export function gmailInstructions({ address, token, sendAs }) {
  const main = sendAs.find((item) => item.address === address);
  const others = sendAs.filter((item) => item.address !== address);

  const lines = [
    `${address} Gmail kurulumu`,
    "",
    "Bilgisayardan yapın, Gmail'in telefon uygulamasında bu ayar yok.",
    "",
    "1. Gmail'de sağ üstteki dişliye tıklayın, Tüm ayarları görün'ü açın.",
    "2. Hesaplar ve İçe Aktarma sekmesine geçin.",
    ...aliasSteps(main, 3),
    "4. SMTP Sunucusu: smtp.resend.com",
    "   Bağlantı noktası: 465",
    "   Kullanıcı adı: resend",
    `   Şifre: ${token}`,
    '   "SSL kullanılarak güvenli bağlantı" seçili kalsın. Hesap ekle\'ye tıklayın.',
    "5. Gmail onay maili gönderir. Gelen maildeki bağlantıya tıklayın.",
    '6. Aynı sayfada "Bir iletiyi yanıtlarken" altında "İletinin gönderildiği adresten yanıtla"yı seçin.',
  ];

  for (const other of others) {
    lines.push(
      "",
      `${other.address} için 3-5. adımları tekrarlayın, SMTP bilgileri aynı. Farklı alanlar:`,
      `Ad: ${other.name}`,
      `E-posta adresi: ${other.address}`,
      other.shared
        ? '"Takma ad olarak değerlendir" işaretini kaldırın.'
        : '"Takma ad olarak değerlendir" işaretli kalsın.',
    );
  }

  lines.push(
    "",
    "Şifre kişiye özeldir, kimseyle paylaşmayın ve bu mesajı kurulumdan sonra silin.",
    '"Farklı bir yanıt adresi belirtin" bağlantısına dokunmayın.',
  );
  return lines.join("\n");
}

export function setupPage({ email, issued }) {
  const title = `${issued.address} anahtarı ${issued.renewed ? "yenilendi" : "hazır"}`;
  return page(
    `${title} · Ahtapot e-posta`,
    `${header(email)}<main class="single">
<h1>${esc(title)}</h1>
<p class="notice alert" role="alert">${icon("warning")}<span>Anahtar yalnız şimdi görünür, saklanmaz. Sayfadan çıkmadan kişiye iletin.</span></p>
<p>Aşağıdaki talimatı kişiye gönderin, anahtar içinde.</p>
<label for="talimat">Kurulum talimatı</label>
<textarea id="talimat" readonly>${esc(gmailInstructions(issued))}</textarea>
<div class="actions">
<button class="primary" type="button" data-copy="talimat">Talimatı kopyalayın</button>
<a class="btn" href="/">Adreslere dönün</a>
</div>
</main>
<script src="/panel.js" defer></script>`,
  );
}

export function errorPage({ email, message }) {
  return page(
    "İşlem tamamlanamadı · Ahtapot e-posta",
    `${email ? header(email) : ""}<main class="single">
<h1>İşlem tamamlanamadı</h1>
<p class="notice alert" role="alert">${icon("warning")}<span>${esc(message)}</span></p>
<a class="btn" href="/">Adreslere dönün</a>
</main>`,
  );
}
