// Worktree'yi ve (develop'a girmişse) dalını siler.
//
//   node tools/agents/wt-remove.mjs <ad|dal|yol> [--force]
//     Commit edilmemiş değişiklik ya da develop'a girmemiş commit varsa reddeder; --force ile
//     klasör yine silinir ama girmemiş commit'leri olan dal SİLİNMEZ (geri dönüş yolu kalsın).
//   node tools/agents/wt-remove.mjs --hook
//     Claude Code'un WorktreeRemove hook'u. stdin: {"worktree_path": "..."}. Claude Code bu yola
//     yalnız kullanıcı silmeyi seçince ya da ExitWorktree discard_changes ile gelir; o yüzden
//     hook modunda klasör silinir, dal yalnız develop'a girmişse silinir.
import fs from "node:fs";
import path from "node:path";
import { BASE_BRANCH, fail, findWorktree, git, isDirty, mainRoot, parseArgs, readStdinJson } from "./lib.mjs";

const { flags, pos } = parseArgs(process.argv.slice(2));
const hook = Boolean(flags.hook);
const log = (s) => process.stderr.write(`${s}\n`);

const ref = hook ? (await readStdinJson()).worktree_path : pos[0];
if (!ref) fail("Kullanım: node tools/agents/wt-remove.mjs <ad|dal|yol> [--force]");

const root = mainRoot(fs.existsSync(ref) ? ref : process.cwd());
const wt = findWorktree(ref, root);
if (!wt) {
  // Hook: klasör zaten yoksa iş bitmiş sayılır.
  if (hook && !fs.existsSync(ref)) process.exit(0);
  fail(`Worktree bulunamadı: ${ref}`);
}
if (path.resolve(process.cwd()).toLowerCase().startsWith(wt.path.toLowerCase())) {
  fail("Silinecek worktree'nin içindesiniz; önce ana checkout'a dönün.");
}

const force = hook || Boolean(flags.force);
const dirty = isDirty(wt.path);
const unmerged = wt.branch
  ? Number(git(["rev-list", "--count", `${BASE_BRANCH}..${wt.branch}`], { cwd: root }))
  : 0;

if (!force && (dirty || unmerged)) {
  fail(
    [
      `${wt.branch ?? wt.path} silinmedi:`,
      dirty ? "  - commit edilmemiş değişiklik var" : null,
      unmerged ? `  - ${BASE_BRANCH}'a girmemiş ${unmerged} commit var` : null,
      "Yine de silmek için --force (girmemiş commit'li dal korunur).",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

git(["worktree", "remove", ...(force ? ["--force"] : []), wt.path], { cwd: root });
log(`✓ Worktree silindi: ${wt.path}`);

if (wt.branch) {
  if (unmerged) {
    log(`• ${wt.branch} korundu (${unmerged} commit ${BASE_BRANCH}'da yok). Silmek: git branch -D ${wt.branch}`);
  } else {
    // -D: "develop'a girdi mi" kontrolünü yukarıda kendimiz yaptık; -d ana checkout'un o anki
    // dalına bakar, ana checkout develop'ta değilse yanlış yere reddederdi.
    git(["branch", "-D", wt.branch], { cwd: root });
    log(`✓ Dal silindi: ${wt.branch}`);
  }
}
