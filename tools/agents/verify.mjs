// Worktree'deki commit'i doğrular: lint → tip denetimi → testler → build.
// Sonucu commit SHA'sıyla birlikte worktree'nin git klasörüne yazar; merge.mjs yalnız
// "bu SHA için tam doğrulama geçti" kaydı varsa birleştirir.
//
//   node tools/agents/verify.mjs [--quick]
//     --quick: build'i atlar (hızlı geri bildirim; merge için sayılmaz).
//
// Build aynı anda tek worktree'de çalışır (makine kilidi): next build birkaç GB bellek kullanıyor,
// paralel ajanlar aynı anda build alınca makine kilitleniyordu.
// Çıktı kısa tutulur: geçen adım tek satır, kalan adımın yalnız son satırları basılır
// (ajanın bağlamına binlerce satır log girmesin).
import fs from "node:fs";
import path from "node:path";
import { VERIFY_FILE, fail, git, gitDir, isDirty, mainRoot, parseArgs, run } from "./lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const quick = Boolean(flags.quick);
const cwd = git(["rev-parse", "--show-toplevel"]);
const root = mainRoot(cwd);
const log = (s) => process.stdout.write(`${s}\n`);

const sha = git(["rev-parse", "HEAD"], { cwd });
const branch = git(["branch", "--show-current"], { cwd });
const dirty = isDirty(cwd);
if (path.resolve(cwd).toLowerCase() === path.resolve(root).toLowerCase()) {
  log("• Not: ana checkout'ta çalışıyor (worktree değil). Sonuç kaydedilir ama merge için anlamı yok.");
}

// Komutlar package.json'daki script'lerden okunur (tek doğruluk kaynağı orası), ama `pnpm run`
// ile değil, node_modules/.bin PATH'e eklenerek doğrudan çalıştırılır: bu makinede pnpm yalnız
// corepack üzerinden var ve `pnpm run` önce bağımlılık denetimi yapıp PATH'te olmayan `pnpm`'i
// çağırınca düşüyordu. Aynı zamanda her adımda pnpm açılış süresinden kurtarır.
const scripts = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")).scripts ?? {};
const steps = [
  { id: "lint", script: "lint" },
  { id: "typecheck", script: "typecheck" },
  { id: "test", script: "test:panel" },
  ...(quick ? [] : [{ id: "build", script: "build", lock: true }]),
];
for (const s of steps) if (!scripts[s.script]) fail(`package.json'da "${s.script}" script'i yok.`);
process.env.PATH = `${path.join(cwd, "node_modules", ".bin")}${path.delimiter}${process.env.PATH}`;

// --- makine geneli build kilidi (ana repo'nun ortak git klasöründe) ---
const lockFile = path.join(path.resolve(cwd, git(["rev-parse", "--git-common-dir"], { cwd })), "agents-build.lock");
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
async function acquireLock() {
  const started = Date.now();
  let announced = false;
  for (;;) {
    try {
      fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, branch, at: new Date().toISOString() }), { flag: "wx" });
      return;
    } catch {
      let holder = {};
      try {
        holder = JSON.parse(fs.readFileSync(lockFile, "utf8"));
      } catch {}
      if (!holder.pid || !alive(holder.pid)) {
        fs.rmSync(lockFile, { force: true }); // sahibi ölmüş kilit
        continue;
      }
      if (!announced) {
        log(`  … build kilidi ${holder.branch ?? "?"} dalında (pid ${holder.pid}); sıra bekleniyor`);
        announced = true;
      }
      if (Date.now() - started > 45 * 60 * 1000) fail("Build kilidi 45 dk boyunca açılmadı.");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
const releaseLock = () => {
  try {
    if (JSON.parse(fs.readFileSync(lockFile, "utf8")).pid === process.pid) fs.rmSync(lockFile);
  } catch {}
};
process.on("exit", releaseLock);
process.on("SIGINT", () => process.exit(130));

log(`Doğrulama: ${branch || "(ayrık HEAD)"} @ ${sha.slice(0, 7)}${dirty ? "  ⚠ commit edilmemiş değişiklik var" : ""}`);
const results = [];
let ok = true;
for (const step of steps) {
  if (step.lock) await acquireLock();
  const t0 = Date.now();
  const res = await run(scripts[step.script], [], { cwd });
  if (step.lock) releaseLock();
  const secs = Math.round((Date.now() - t0) / 1000);
  results.push({ id: step.id, ok: res.code === 0, secs });
  if (res.code === 0) {
    log(`  ✓ ${step.id} (${secs} sn)`);
  } else {
    ok = false;
    log(`  ✗ ${step.id} (${secs} sn) — son satırlar:`);
    log(
      res.out
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .slice(-40)
        .map((l) => `    ${l}`)
        .join("\n"),
    );
    break; // ilk hatada dur: sonraki adımlar zaten anlamsız, zaman ve bellek harcamasın
  }
}

const record = {
  sha,
  branch,
  ok: ok && !dirty,
  full: !quick,
  dirty,
  steps: results,
  at: new Date().toISOString(),
};
fs.writeFileSync(path.join(gitDir(cwd), VERIFY_FILE), JSON.stringify(record, null, 2));

if (dirty) log("✗ Commit edilmemiş değişiklik var: sonuç merge için GEÇERSİZ. Commit edip tekrar çalıştırın.");
else if (!ok) log("✗ Doğrulama başarısız.");
else log(quick ? "✓ Hızlı doğrulama geçti (build yok; merge için tam doğrulama gerekir)." : "✓ Tam doğrulama geçti; bu commit merge'e hazır.");
process.exit(record.ok ? 0 : 1);
