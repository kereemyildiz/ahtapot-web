// Renkler sitenin koyu temasıyla aynı (src/app/globals.css). Köşeler dik: meander dili.
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
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font: 16px/1.5 ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
}
main, .top { max-width: 1040px; margin: 0 auto; padding-inline: 24px; }
.top { display: flex; align-items: center; gap: 12px; padding-block: 20px; flex-wrap: wrap; }
.top strong { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.top .who { margin-left: auto; color: var(--muted); font-size: 14px; overflow-wrap: anywhere; }
.logo { width: 22px; height: 29px; flex: none; }
main { padding-bottom: 64px; }
section { padding-block: 28px; border-top: 1px solid var(--wire); }
h1, h2 { margin: 0 0 16px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
h1 { font-size: 28px; }
h2 { font-size: 20px; }
p { margin: 0 0 12px; }
.muted { color: var(--muted); }
.small { font-size: 14px; }
a { color: var(--periwinkle); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.notice { padding: 12px 16px; margin: 0 0 20px; background: var(--surface); border-left: 3px solid var(--accent); }
.notice.alert { border-left-color: var(--alert); color: var(--alert); }

.quota { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.quota b { font-size: 24px; font-weight: 600; }
meter { display: block; width: 100%; height: 8px; margin-top: 8px; }
meter::-webkit-meter-bar { background: var(--surface-2); border: 0; border-radius: 0; height: 8px; }
meter::-webkit-meter-optimum-value { background: var(--accent); }
meter::-webkit-meter-suboptimum-value { background: var(--alert); }
meter::-webkit-meter-even-less-good-value { background: var(--alert); }
meter::-moz-meter-bar { background: var(--accent); }

table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 12px 12px 0; text-align: left; vertical-align: top; border-bottom: 1px solid var(--wire); overflow-wrap: anywhere; }
th { color: var(--muted); font-size: 14px; font-weight: 500; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.status-wait { color: var(--alert); }

.button, button {
  display: inline-block;
  padding: 8px 14px;
  border: 0;
  border-radius: 0;
  background: var(--surface-2);
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.primary { background: var(--accent); color: var(--accent-ink); }
.danger { color: var(--alert); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
@media (hover: hover) {
  .button:hover, button:hover:not(:disabled) { background: var(--wire); }
  .primary:hover, button.primary:hover:not(:disabled) { background: #eafcc4; }
}

form { margin: 0; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
label { display: block; font-size: 14px; color: var(--muted); }
input[type="text"], input[type="email"], textarea {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: 0;
  border-radius: 0;
  background: var(--field);
  color: var(--field-ink);
  font: inherit;
}
.check { display: flex; gap: 8px; align-items: center; margin-block: 16px; color: var(--ink); font-size: 16px; }
.suffix { display: flex; align-items: flex-end; gap: 8px; }
.suffix span { padding-bottom: 10px; color: var(--ink); }
textarea { min-height: 420px; font-family: ui-monospace, "SFMono-Regular", Consolas, monospace; font-size: 14px; }

ol.log { list-style: none; margin: 0; padding: 0; }
ol.log li { padding-block: 8px; border-bottom: 1px solid var(--wire); font-size: 14px; }

.center { max-width: 520px; margin: 12vh auto 0; }

@media (max-width: 760px) {
  main, .top { padding-inline: 16px; }
  .form-grid { grid-template-columns: minmax(0, 1fr); }
  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  tr, td { display: block; }
  tr { padding-block: 12px; border-bottom: 1px solid var(--wire); }
  td { padding: 2px 0; border: 0; }
  td[data-label]::before { content: attr(data-label) ": "; color: var(--muted); }
}
`;

// Yalnız "Kopyala" düğmesi; kalan her şey betiksiz çalışır.
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
