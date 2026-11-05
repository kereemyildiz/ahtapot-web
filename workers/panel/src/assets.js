// Renkler ve yazı tipleri sitenin koyu temasıyla aynı (src/app/globals.css).
// Köşeler dik: meander dili. Seçim ve yönlendirme 1 px çizgiyle gösterilir.
export const CSS = `
:root {
  color-scheme: dark;
  --ground: #0a0c16;
  --surface: #12162a;
  --surface-2: #1b2038;
  --ink: #eef0f6;
  --muted: #a2a8bc;
  --accent: #d7f89a;
  --accent-ink: #0a0c16;
  --periwinkle: #93a4f4;
  --field: #e9ecf4;
  --field-ink: #0a0c16;
  --alert: #ff9db8;
  --wire: #2b3566;
  --rule: #1b2038;
  --display: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
  --body: "Onest", ui-sans-serif, system-ui, sans-serif;
  --gutter: 32px;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font: 400 15px/1.5 var(--body);
  font-variant-numeric: tabular-nums;
}
h1, h2, p, ul, ol { margin: 0; padding: 0; }
ul, ol { list-style: none; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.muted { color: var(--muted); }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
svg.icon { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: square; }

.bar {
  display: flex; align-items: center; gap: 12px;
  height: 64px; padding-inline: var(--gutter);
  border-bottom: 1px solid var(--rule);
}
.brand { display: flex; align-items: center; gap: 12px; text-decoration: none; font: 600 16px/1 var(--display); letter-spacing: -0.01em; }
.logo { width: 21px; height: 28px; flex: none; }
.bar .who { margin-left: auto; color: var(--muted); font-size: 14px; overflow-wrap: anywhere; }

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 48px;
  max-width: 1360px;
  margin-inline: auto;
  padding: 32px var(--gutter) 64px;
}

.title-row { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h1 { font: 600 28px/1.15 var(--display); letter-spacing: -0.02em; }
.title-row p { margin-top: 4px; color: var(--muted); font-size: 14px; }

.notice { display: flex; gap: 10px; padding: 12px 14px; margin-bottom: 20px; background: var(--surface); border-left: 2px solid var(--accent); }
.notice.alert { border-left-color: var(--alert); }
.notice svg.icon { margin-top: 3px; }
.notice.alert svg.icon { color: var(--alert); }

/* Düğmeler */
.btn, button, summary.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 36px; padding: 7px 14px;
  border: 0; border-radius: 0;
  background: var(--surface-2); color: var(--ink);
  font: 500 14px/1.3 var(--body);
  text-decoration: none; cursor: pointer; white-space: nowrap;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.btn.primary, button.primary { background: var(--accent); color: var(--accent-ink); }
.link {
  min-height: 28px; padding: 2px 0;
  background: none; color: var(--muted);
  font-weight: 400;
  text-decoration: underline; text-decoration-color: var(--wire); text-underline-offset: 3px;
}
.link.danger { color: var(--alert); }
@media (hover: hover) {
  .btn:hover, button:hover, summary.btn:hover { background: var(--wire); }
  .btn.primary:hover, button.primary:hover { background: #eafcc4; }
  .link:hover { background: none; color: var(--ink); text-decoration-color: currentColor; }
  .link.danger:hover { color: var(--alert); }
}
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }

/* Yeni adres */
.new-address form {
  position: absolute; z-index: 10; top: 44px; right: 0;
  display: grid; gap: 14px;
  width: min(420px, 100%); padding: 20px;
  background: var(--surface);
  border: 1px solid var(--wire);
}
label { display: block; color: var(--muted); font-size: 14px; }
input[type="text"], input[type="email"], textarea {
  display: block; width: 100%; min-height: 40px; margin-top: 6px; padding: 8px 12px;
  border: 0; border-radius: 0;
  background: var(--field); color: var(--field-ink);
  font: 400 15px/1.4 var(--body);
}
.with-suffix { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.with-suffix input { margin-top: 0; }
.with-suffix span { color: var(--ink); }
.hint { color: var(--muted); font-size: 13px; }

/* Adres tablosu */
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th:nth-child(1) { width: 26%; }
th:nth-child(2) { width: 36%; }
th:nth-child(3) { width: 22%; }
th { padding: 0 16px 10px 0; color: var(--muted); font: 400 13px/1.3 var(--body); text-align: left; }
td { padding: 16px 16px 16px 0; vertical-align: top; border-top: 1px solid var(--rule); }
th:last-child, td:last-child { padding-right: 0; text-align: right; }
.address { font: 600 16px/1.3 var(--display); letter-spacing: -0.01em; overflow-wrap: anywhere; }
.address span { color: var(--muted); font-weight: 500; }
.owner { margin-top: 2px; color: var(--muted); font-size: 14px; }

/* Alıcılar: adresten çıkan kol, logodaki dik açılı çizgi */
.arms { position: relative; }
.arms li { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 0 6px; min-height: 30px; padding-left: 18px; }
.arms li::before {
  content: ""; position: absolute; left: 0; top: -6px; bottom: 50%; width: 12px;
  border-left: 1px solid var(--wire); border-bottom: 1px solid var(--wire);
}
.arms li:first-child::before { top: 6px; }
.arms li:not(:last-child)::after {
  content: ""; position: absolute; left: 0; top: 50%; bottom: 0; border-left: 1px solid var(--wire);
}
.arms .email { overflow-wrap: anywhere; }
.arms .waiting { display: inline-flex; align-items: center; gap: 4px; color: var(--alert); font-size: 13px; white-space: nowrap; }
.arms form { display: inline-flex; }
.remove {
  min-height: 24px; width: 24px; padding: 0;
  background: none; color: var(--muted);
}
@media (hover: hover) { .remove:hover { background: var(--surface-2); color: var(--ink); } }
.add-recipient > summary { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: 14px; }
@media (hover: hover) { .add-recipient > summary:hover { color: var(--ink); } }
.add-recipient form { display: flex; gap: 8px; margin-top: 4px; width: min(340px, 100%); }
.add-recipient input { margin-top: 0; min-height: 36px; }

.send { color: var(--muted); font-size: 14px; }
.send strong, .send span { display: block; }
.send strong { color: var(--ink); font-weight: 500; }
.send form, .send a.link { margin-top: 2px; }
.send a.link { display: flex; width: fit-content; }
.lock { color: var(--muted); font-size: 13px; }

/* Yan sütun */
.rail { display: grid; gap: 36px; align-content: start; }
.rail h2 { margin-bottom: 14px; font: 600 16px/1.3 var(--display); letter-spacing: -0.01em; }
.usage { display: grid; gap: 14px; }
.usage dt { color: var(--muted); font-size: 14px; }
.usage dd { margin: 0; font: 600 24px/1.2 var(--display); letter-spacing: -0.01em; }
.usage dd span { color: var(--muted); font-size: 14px; font-weight: 400; font-family: var(--body); letter-spacing: 0; }
meter { display: block; width: 100%; height: 3px; margin-top: 8px; }
meter::-webkit-meter-bar { height: 3px; background: var(--surface-2); border: 0; border-radius: 0; }
meter::-webkit-meter-optimum-value { background: var(--accent); }
meter::-webkit-meter-suboptimum-value, meter::-webkit-meter-even-less-good-value { background: var(--alert); }
meter::-moz-meter-bar { background: var(--accent); }
.rail .hint { margin-top: 12px; }
.log li { padding-block: 10px; border-top: 1px solid var(--rule); font-size: 14px; }
.log li:first-child { border-top: 0; padding-top: 0; }
.log time { display: block; color: var(--muted); font-size: 13px; }

/* Tek işlem sayfaları */
.single { max-width: 720px; margin-inline: auto; padding: 40px var(--gutter) 64px; }
.single h1 { margin-bottom: 12px; overflow-wrap: anywhere; }
.single p { margin-bottom: 16px; }
.single .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
textarea { min-height: 440px; margin-top: 8px; font-size: 14px; line-height: 1.55; }
.login { max-width: 420px; margin: 18vh auto 0; padding-inline: var(--gutter); }
.login .logo { width: 30px; height: 40px; margin-bottom: 20px; }
.login h1 { margin-bottom: 8px; }
.login p { margin-bottom: 20px; color: var(--muted); }
.login .notice { color: var(--ink); }

@media (max-width: 1080px) {
  .layout { grid-template-columns: minmax(0, 1fr); gap: 40px; }
}
@media (max-width: 860px) {
  :root { --gutter: 16px; }
  .bar .who { display: none; }
  .bar form { margin-left: auto; }
  .layout { padding-top: 24px; }
  .new-address form { position: fixed; top: 72px; left: 16px; right: 16px; width: auto; }
  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  table, tbody, tr, td { display: block; }
  th { width: auto; }
  tr { padding-block: 14px; border-top: 1px solid var(--rule); }
  td { padding: 0 0 10px; border: 0; }
  td:last-child { padding-bottom: 0; text-align: left; }
  .btn, button, summary.btn { min-height: 44px; }
  .link { min-height: 32px; }
  .remove { min-height: 36px; width: 36px; }
}
`;

// Yalnız "Kopyalayın" düğmesi; kalan her şey betiksiz çalışır.
export const SCRIPT = `
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copy);
    target.select();
    await navigator.clipboard.writeText(target.value);
    button.textContent = "Kopyalandı";
  });
});
`;
