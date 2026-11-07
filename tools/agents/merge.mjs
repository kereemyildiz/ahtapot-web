// Doğrulanmış bir işi develop'a birleştirir. Ana checkout'tan (develop dalında) çalıştırılır.
//
//   node tools/agents/merge.mjs <ad|dal>            → yalnız planı gösterir (commit'ler, değişen dosyalar)
//   node tools/agents/merge.mjs <ad|dal> --yes      → birleştirir, worktree'yi ve dalı siler
//        --push   develop'u origin'e de gönderir (Cloudflare önizleme sürümü; canlıya dokunmaz)
//        --keep   worktree'yi ve dalı silmez
//
// Kapılar (hepsi geçmeden birleştirmez):
//   1. Ana checkout develop'ta ve temiz.
//   2. Worktree temiz (commit edilmemiş değişiklik yok).
//   3. Dalın ucu için TAM doğrulama kaydı var ve geçmiş (verify.mjs).
//   4. Dal develop'un en son hâlinin üstünde (develop dalın atası). Böylece birleşen ağaç,
//      doğrulanan ağacın ta kendisi olur; "ayrı ayrı geçti, birlikte bozuldu" olmaz.
//      Değilse worktree'de: git rebase develop → verify.mjs → tekrar.
import path from "node:path";
import { BASE_BRANCH, fail, findWorktree, git, isDirty, mainRoot, parseArgs, readVerify, run } from "./lib.mjs";

const { flags, pos } = parseArgs(process.argv.slice(2));
const log = (s) => process.stdout.write(`${s}\n`);
if (!pos[0]) fail("Kullanım: node tools/agents/merge.mjs <ad|dal> [--yes] [--push] [--keep]");

const root = mainRoot();
const here = git(["rev-parse", "--show-toplevel"]);
if (path.resolve(here).toLowerCase() !== path.resolve(root).toLowerCase()) {
  fail(`Ana checkout'tan çalıştırın (${root}); şu an bir worktree içindesiniz.`);
}

const wt = findWorktree(pos[0], root);
if (!wt?.branch) fail(`Worktree/dal bulunamadı: ${pos[0]}  (node tools/agents/status.mjs ile listeleyin)`);
const { branch } = wt;

const problems = [];
const current = git(["branch", "--show-current"], { cwd: root });
if (current !== BASE_BRANCH) problems.push(`Ana checkout ${BASE_BRANCH} dalında değil (${current}).`);
if (git(["status", "--porcelain", "--untracked-files=no"], { cwd: root })) {
  problems.push("Ana checkout'ta commit edilmemiş değişiklik var.");
}
if (isDirty(wt.path)) problems.push(`${branch} worktree'sinde commit edilmemiş değişiklik var.`);

const tip = git(["rev-parse", branch], { cwd: root });
const v = readVerify(wt.path);
if (!v) problems.push("Doğrulama kaydı yok → worktree'de: node tools/agents/verify.mjs");
else if (v.sha !== tip) problems.push(`Doğrulama eski (${v.sha.slice(0, 7)}), dalın ucu ${tip.slice(0, 7)} → tekrar doğrulayın.`);
else if (!v.full) problems.push("Yalnız hızlı doğrulama var (build yok) → --quick olmadan çalıştırın.");
else if (!v.ok) problems.push("Doğrulama başarısız → hatayı düzeltin, tekrar doğrulayın.");

const upToDate = git(["merge-base", "--is-ancestor", BASE_BRANCH, branch], { cwd: root, allowFail: true }) !== null;
if (!upToDate) {
  problems.push(`${branch}, ${BASE_BRANCH}'un son hâlinin üstünde değil → worktree'de: git rebase ${BASE_BRANCH}, sonra tekrar doğrulayın.`);
}

const commits = git(["log", "--oneline", "--no-decorate", `${BASE_BRANCH}..${branch}`], { cwd: root });
if (!commits) problems.push(`${branch} dalında ${BASE_BRANCH}'da olmayan commit yok; birleştirilecek bir şey yok.`);

log(`Birleştirme planı: ${branch} → ${BASE_BRANCH}`);
log("");
log("Commit'ler:");
log(commits ? commits.split("\n").map((l) => `  ${l}`).join("\n") : "  (yok)");
log("");
log("Değişen dosyalar:");
log(git(["diff", "--stat", `${BASE_BRANCH}...${branch}`], { cwd: root }) || "  (yok)");
log("");
if (v) log(`Doğrulama: ${v.ok ? "✓" : "✗"} ${v.full ? "tam" : "hızlı"} @ ${v.sha.slice(0, 7)} — ${v.steps.map((s) => `${s.id} ${s.ok ? "✓" : "✗"} ${s.secs}sn`).join(", ")}`);

if (problems.length) {
  log("");
  log("Birleştirilemez:");
  problems.forEach((p) => log(`  ✗ ${p}`));
  process.exit(1);
}

if (!flags.yes) {
  log("");
  log(`Kapılar geçti. Birleştirmek için: node tools/agents/merge.mjs ${branch} --yes${flags.push ? " --push" : ""}`);
  process.exit(0);
}

git(["merge", "--no-ff", branch, "-m", `Merge ${branch}`], { cwd: root });
log("");
log(`✓ ${branch} → ${BASE_BRANCH} birleşti (${git(["rev-parse", "--short", "HEAD"], { cwd: root })})`);

if (flags.push) {
  const res = await run("git", ["push", "origin", BASE_BRANCH], { cwd: root });
  if (res.code !== 0) fail(`push başarısız:\n${res.out}`);
  log(`✓ origin/${BASE_BRANCH} güncellendi (önizleme sürümü oluşacak)`);
}

if (!flags.keep) {
  const res = await run("node", [path.join(root, "tools/agents/wt-remove.mjs"), wt.path], { cwd: root });
  process.stdout.write(res.out);
  if (res.code !== 0) log("• Worktree silinemedi; elle: node tools/agents/wt-remove.mjs " + branch);
}
