const COMPANY = "Ahtapot Tıbbi Teknolojiler";

const LOGO_PATHS = [
  "M430 150 L618 338 L430 526 L242 338 Z",
  "M362 458 V845 H200 V730 H290 V785",
  "M498 458 V845 H660 V730 H570 V785",
  "M300 396 V640 H170 V520 H230 V565",
  "M560 396 V640 H690 V520 H630 V565",
];

const LOGO = `<svg class="logo" viewBox="140 112 580 765" fill="none" stroke="#93a4f4" stroke-width="40" stroke-linecap="square" aria-hidden="true">${LOGO_PATHS.map((d) => `<path d="${d}"/>`).join("")}</svg>`;

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

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
<link rel="stylesheet" href="/stil.css">
</head>
<body>${body}</body>
</html>`;
}

function header(email) {
  return `<header class="top">${LOGO}<strong>E-posta paneli</strong>
<span class="who">${esc(email)}</span>
<form method="post" action="/cikis"><button type="submit">Çıkış yapın</button></form>
</header>`;
}

export function loginPage(message) {
  return page(
    "Giriş · E-posta paneli",
    `<main><div class="center">
<h1>E-posta paneli</h1>
${message ? `<p class="notice alert">${esc(message)}</p>` : ""}
<p class="muted">Yalnız yetkili Google hesaplarıyla girilebilir.</p>
<a class="button primary" href="/auth/google">Google ile giriş yapın</a>
</div></main>`,
  );
}

const MESSAGES = {
  eklendi: "Kişi eklendi. Doğrulama maili kişinin Gmail'ine gönderildi.",
  iptal: "Ekleme iptal edildi.",
  cikarildi: "Kişi çıkarıldı.",
  info: "info@ alıcıları güncellendi. Değişiklik en çok bir dakikada geçerli olur.",
};

function quotaBlock(label, used, limit) {
  if (used === null) {
    return `<div><span class="muted">${label}</span><br><b>Okunamadı</b></div>`;
  }
  return `<div><span class="muted">${label}</span><br><b>${used} / ${limit.toLocaleString("tr-TR")}</b>
<meter min="0" max="${limit}" low="${limit * 0.8}" high="${limit * 0.8}" optimum="0" value="${Math.min(used, limit)}">${used} / ${limit}</meter></div>`;
}

function personRow(person) {
  const keyText = person.key
    ? `Var${person.key.last_used_at ? `<br><span class="muted small">Son kullanım: ${esc(dateFormat.format(new Date(person.key.last_used_at)))}</span>` : ""}`
    : "Yok";
  const local = esc(person.local);
  return `<tr>
<td data-label="Kişi">${esc(person.name)}</td>
<td data-label="Adres">${esc(person.address)}</td>
<td data-label="Gmail">${esc(person.gmail)}</td>
<td data-label="Anahtar">${keyText}</td>
<td data-label="info@">${person.inInfo ? "Alıyor" : "Almıyor"}</td>
<td><div class="actions">
<form method="post" action="/kisi/${local}/info"><input type="hidden" name="durum" value="${person.inInfo ? "kapat" : "ac"}"><button type="submit">${person.inInfo ? "info@ alıcılığını kapatın" : "info@ alıcısı yapın"}</button></form>
<a class="button" href="/kisi/${local}/anahtar">${person.key ? "Anahtarı yenileyin" : "Anahtar üretin"}</a>
<a class="button danger" href="/kisi/${local}/cikar">Kişiyi çıkarın</a>
</div></td>
</tr>`;
}

function pendingRow(person, domain) {
  const local = esc(person.local);
  return `<tr>
<td data-label="Kişi">${esc(person.name)}</td>
<td data-label="Adres">${local}@${esc(domain)}</td>
<td data-label="Gmail">${esc(person.gmail)}</td>
<td colspan="2">${person.verified ? "Gmail doğrulandı" : '<span class="status-wait">Doğrulama bekleniyor</span>'}</td>
<td><div class="actions">
<form method="post" action="/kisi/${local}/tamamla"><button class="primary" type="submit"${person.verified ? "" : " disabled"}>Kurulumu tamamlayın</button></form>
<form method="post" action="/kisi/${local}/iptal"><button class="danger" type="submit">İptal edin</button></form>
</div></td>
</tr>`;
}

export function dashboardPage({ overview, email, domain, limits, ok }) {
  const { people, pending, system, infoTargets, quota, log } = overview;
  const empty = people.length === 0 && pending.length === 0;

  const systemRows = system
    .map((rule) => {
      const target = rule.local === "info" ? infoTargets.join(", ") || "Liste boş" : rule.gmail;
      return `<tr><td data-label="Adres">${esc(rule.address)}</td><td data-label="Nereye gider">${esc(target ?? "")}</td></tr>`;
    })
    .join("");

  return page(
    "E-posta paneli",
    `${header(email)}<main>
${MESSAGES[ok] ? `<p class="notice" role="status">${MESSAGES[ok]}</p>` : ""}
<section aria-labelledby="kota">
<h2 id="kota">Resend kotası</h2>
<div class="quota">
${quotaBlock("Bugün", quota.daily, limits.daily)}
${quotaBlock("Bu ay", quota.monthly, limits.monthly)}
</div>
<p class="muted small">Talep formu ve tüm kişilerin gönderimleri aynı kotayı kullanır. Her alıcı ayrı sayılır. Günlük kota 03:00'te yenilenir.</p>
</section>

<section aria-labelledby="kisiler">
<h2 id="kisiler">Kişiler</h2>
${
  empty
    ? '<p class="muted">Henüz kişi yok. Aşağıdan ilk kişiyi ekleyin.</p>'
    : `<table>
<thead><tr><th>Kişi</th><th>Adres</th><th>Gmail</th><th>Anahtar</th><th>info@</th><th><span class="muted">İşlemler</span></th></tr></thead>
<tbody>${pending.map((person) => pendingRow(person, domain)).join("")}${people.map(personRow).join("")}</tbody>
</table>`
}
</section>

<section aria-labelledby="yeni">
<h2 id="yeni">Yeni kişi</h2>
<form method="post" action="/kisi">
<div class="form-grid">
<label>Ad soyad<input type="text" name="name" required maxlength="80" autocomplete="off"></label>
<label>Adres<span class="suffix"><input type="text" name="local" required maxlength="40" pattern="[a-z0-9._\\-]+" placeholder="ahmet.yilmaz" autocomplete="off" spellcheck="false" autocapitalize="none"><span>@${esc(domain)}</span></span></label>
<label>Kişinin Gmail'i<input type="email" name="gmail" required autocomplete="off"></label>
</div>
<label class="check"><input type="checkbox" name="info"> info@ adresine gelen mailleri de alsın</label>
<button class="primary" type="submit">Kişiyi ekleyin</button>
</form>
<p class="muted small">Kişiye bir doğrulama maili gider. Kişi bağlantıya tıkladıktan sonra burada kurulumu tamamlarsınız.</p>
</section>

<section aria-labelledby="sistem">
<h2 id="sistem">Sistem adresleri</h2>
<table><thead><tr><th>Adres</th><th>Nereye gider</th></tr></thead><tbody>${systemRows}</tbody></table>
<p class="muted small">Bu adresler panelden silinemez. info@ alıcılarını kişiler tablosundan değiştirebilirsiniz.</p>
</section>

<section aria-labelledby="kayit">
<h2 id="kayit">İşlem kaydı</h2>
${
  log.length
    ? `<ol class="log">${log.map((item) => `<li><span class="muted">${esc(dateFormat.format(new Date(item.at)))} · ${esc(item.actor)}</span><br>${esc(item.text)}</li>`).join("")}</ol>`
    : '<p class="muted">Henüz işlem yok.</p>'
}
</section>
</main>`,
  );
}

export function confirmPage({ email, title, text, action, button }) {
  return page(
    `${title} · E-posta paneli`,
    `${header(email)}<main><section>
<h1>${esc(title)}</h1>
<p>${esc(text)}</p>
<div class="actions">
<form method="post" action="${esc(action)}"><button class="primary" type="submit">${esc(button)}</button></form>
<a class="button" href="/">Vazgeçin</a>
</div>
</section></main>`,
  );
}

export function gmailInstructions({ name, address, token, info, domain }) {
  const smtp = `SMTP Sunucusu: smtp.resend.com
   Bağlantı noktası: 465
   Kullanıcı adı: resend
   Şifre: ${token}
   "SSL kullanılarak güvenli bağlantı" seçili kalsın.`;

  const lines = [
    `${address} Gmail kurulumu`,
    "",
    "Bilgisayardan yapın, Gmail'in telefon uygulamasında bu ayar yok.",
    "",
    "1. Gmail'de sağ üstteki dişliye tıklayın, Tüm ayarları görün'ü açın.",
    "2. Hesaplar ve İçe Aktarma sekmesine geçin.",
    '3. "Postayı şu adresten gönder" satırında "Başka bir e-posta adresi ekle"ye tıklayın.',
    `4. Ad: ${name}`,
    `   E-posta adresi: ${address}`,
    '   "Takma ad olarak değerlendir" işaretli kalsın. Sonraki adıma geçin.',
    `5. ${smtp}`,
    "   Hesap ekle'ye tıklayın.",
    "6. Gmail onay maili gönderir. Gelen maildeki bağlantıya tıklayın.",
    '7. Aynı sayfada "Bir iletiyi yanıtlarken" altında "İletinin gönderildiği adresten yanıtla"yı seçin.',
  ];

  if (info) {
    lines.push(
      "",
      `info@${domain} için 3-6. adımları tekrarlayın, yalnız şu alanlar farklı:`,
      `Ad: ${COMPANY}`,
      `E-posta adresi: info@${domain}`,
      '"Takma ad olarak değerlendir" işaretini kaldırın.',
    );
  }

  lines.push(
    "",
    "Şifre kişiye özeldir, kimseyle paylaşmayın ve bu maili kurulumdan sonra silin.",
    '"Farklı bir yanıt adresi belirtin" bağlantısına dokunmayın.',
  );
  return lines.join("\n");
}

export function setupPage({ email, domain, person, renewed }) {
  const title = renewed ? `${person.address} anahtarı yenilendi` : `${person.address} hazır`;
  if (!person.token) {
    return page(
      `${title} · E-posta paneli`,
      `${header(email)}<main><section>
<h1>${esc(title)}</h1>
<p>Bu kişinin anahtarı daha önce üretilmişti. Kurulum talimatı gerekiyorsa kişiler tablosundan anahtarı yenileyin.</p>
<a class="button primary" href="/">Panele dönün</a>
</section></main>`,
    );
  }

  const text = gmailInstructions({ ...person, domain });
  return page(
    `${title} · E-posta paneli`,
    `${header(email)}<main><section>
<h1>${esc(title)}</h1>
<p class="notice alert" role="alert">Bu anahtar yalnız şimdi görünür, saklanmaz. Sayfadan çıkmadan kişiye iletin.</p>
<p>Aşağıdaki talimatı kişiye gönderin. Anahtar talimatın içinde.</p>
<label for="talimat">Kurulum talimatı</label>
<textarea id="talimat" readonly>${esc(text)}</textarea>
<p></p>
<div class="actions">
<button class="primary" type="button" data-copy="talimat">Talimatı kopyalayın</button>
<a class="button" href="/">Panele dönün</a>
</div>
</section></main>
<script src="/panel.js" defer></script>`,
  );
}

export function errorPage({ email, message }) {
  return page(
    "İşlem tamamlanamadı · E-posta paneli",
    `${email ? header(email) : ""}<main><section>
<h1>İşlem tamamlanamadı</h1>
<p class="notice alert" role="alert">${esc(message)}</p>
<a class="button" href="/">Panele dönün</a>
</section></main>`,
  );
}
