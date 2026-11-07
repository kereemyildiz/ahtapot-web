// Açık işlerin durumu, doğrudan git'ten: hangi worktree, hangi dal, develop'a göre kaç commit
// önde/geride, commit edilmemiş değişiklik, son commit ve doğrulama sonucu.
// Orkestratörün "kim ne durumda" bilgisi buradan gelir, hafızadan değil.
//
//   node tools/agents/status.mjs [--json]
import { BASE_BRANCH, git, isDirty, listWorktrees, mainRoot, parseArgs, readBriefTitle, readVerify } from "./lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const root = mainRoot();
const all = listWorktrees(root);
const main = all.find((w) => w.main);

const rows = all
  .filter((w) => !w.main)
  .map((w) => {
    const row = { branch: w.branch, path: w.path };
    if (!w.branch) return { ...row, note: "ayrık HEAD" };
    const [behind, ahead] = git(["rev-list", "--left-right", "--count", `${BASE_BRANCH}...${w.branch}`], { cwd: root })
      .split(/\s+/)
      .map(Number);
    const v = readVerify(w.path);
    let verify = "yok";
    if (v) {
      if (v.sha !== w.head) verify = "eski (sonra commit var)";
      else if (!v.ok) verify = v.dirty ? "geçersiz (kirli ağaç)" : `başarısız (${v.steps.find((s) => !s.ok)?.id ?? "?"})`;
      else verify = v.full ? "tam ✓" : "hızlı ✓ (build yok)";
    }
    return {
      ...row,
      ahead,
      behind,
      dirty: isDirty(w.path),
      last: git(["log", "-1", "--format=%h %s (%cr)", w.branch], { cwd: root }),
      verify,
      title: readBriefTitle(w.branch, root),
      mergeReady: ahead > 0 && behind === 0 && v?.ok && v.full && v.sha === w.head,
    };
  });

if (flags.json) {
  process.stdout.write(JSON.stringify({ main: { path: main.path, branch: main.branch, dirty: isDirty(main.path) }, worktrees: rows }, null, 2) + "\n");
  process.exit(0);
}

const out = [];
out.push(`Ana checkout: ${main.path} [${main.branch}]${isDirty(main.path) ? "  ⚠ commit edilmemiş değişiklik" : ""}`);
if (main.branch !== BASE_BRANCH) out.push(`  ⚠ ana checkout ${BASE_BRANCH} dalında değil`);
if (!rows.length) out.push("Açık worktree yok.");
for (const r of rows) {
  out.push("");
  out.push(`${r.mergeReady ? "●" : "○"} ${r.branch ?? "(dalsız)"}${r.mergeReady ? "  — merge'e hazır" : ""}`);
  if (r.title) out.push(`    görev: ${r.title}`);
  out.push(`    ${r.path}`);
  if (r.note) {
    out.push(`    ${r.note}`);
    continue;
  }
  out.push(
    `    ${BASE_BRANCH}'a göre ${r.ahead} önde, ${r.behind} geride${r.behind ? " (rebase gerekir)" : ""}` +
      `${r.dirty ? " · commit edilmemiş değişiklik" : ""}`,
  );
  out.push(`    son: ${r.last}`);
  out.push(`    doğrulama: ${r.verify}`);
}
process.stdout.write(out.join("\n") + "\n");
