// İnceleme paketi: bir dalın develop'a göre değişikliğini tek dosyaya yazar ve yolunu basar.
// Reviewer ajanı bu dosyayı okur; diff orkestratörün bağlamına hiç girmez.
// Yer: <ortak git klasörü>/agents/<anahtar>/review-<kısa sha>.md
//
//   node tools/agents/review-package.mjs <ad|dal>
import fs from "node:fs";
import path from "node:path";
import { BASE_BRANCH, fail, findWorktree, git, mainRoot, parseArgs, readVerify, taskDir } from "./lib.mjs";

const { pos } = parseArgs(process.argv.slice(2));
if (!pos[0]) fail("Kullanım: node tools/agents/review-package.mjs <ad|dal>");
const root = mainRoot();
const wt = findWorktree(pos[0], root);
const branch = wt?.branch ?? pos[0];
if (!git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: root, allowFail: true })) {
  fail(`Dal bulunamadı: ${branch}`);
}
const tip = git(["rev-parse", "--short", branch], { cwd: root });
const dir = taskDir(branch, { root });
const brief = path.join(dir, "brief.md");
const v = wt ? readVerify(wt.path) : null;

const parts = [
  `# İnceleme paketi: ${branch} @ ${tip}`,
  "",
  `Taban: ${BASE_BRANCH} @ ${git(["rev-parse", "--short", BASE_BRANCH], { cwd: root })}`,
  `Görev tanımı: ${fs.existsSync(brief) ? brief : "(diskte yok)"}`,
  `Worktree: ${wt?.path ?? "(yok)"}`,
  `Doğrulama: ${v ? `${v.ok ? "✓" : "✗"} ${v.full ? "tam" : "hızlı"} @ ${v.sha.slice(0, 7)}${v.sha.startsWith(git(["rev-parse", branch], { cwd: root })) ? "" : " (ESKİ: dalın ucu değil)"}` : "yok"}`,
  "",
  "## Commit'ler",
  "```",
  git(["log", "--no-decorate", "--format=%h %s", `${BASE_BRANCH}..${branch}`], { cwd: root }) || "(yok)",
  "```",
  "",
  "## Değişen dosyalar",
  "```",
  git(["diff", "--stat=200", `${BASE_BRANCH}...${branch}`], { cwd: root }) || "(yok)",
  "```",
  "",
  "## Diff (bağlam 10 satır)",
  "```diff",
  git(["diff", "-U10", `${BASE_BRANCH}...${branch}`], { cwd: root }),
  "```",
  "",
];
const out = path.join(dir, `review-${tip}.md`);
fs.writeFileSync(out, parts.join("\n"));
const kb = Math.round(fs.statSync(out).size / 1024);
process.stdout.write(`${out}\n`);
process.stderr.write(`• ${kb} KB${kb > 400 ? " — büyük: reviewer dosyayı parça parça okumalı" : ""}\n`);
