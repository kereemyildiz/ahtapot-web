// Yeni iş için worktree açar: repo'nun yanında, develop'tan, feature/<ad> (ya da fix/<ad>) dalıyla,
// .worktreeinclude dosyalarını kopyalar ve bağımlılıkları kurar.
//
//   node tools/agents/wt-new.mjs <ad> [--base develop] [--no-install]
//     <ad> "fix-" ya da "fix/" ile başlarsa dal fix/<ad> olur, yoksa feature/<ad>.
//   node tools/agents/wt-new.mjs --hook
//     Claude Code'un WorktreeCreate hook'u (.claude/settings.json). stdin: {"name": "..."};
//     stdout'un son satırı worktree yolu, diğer her şey stderr.
//
// Aynı adla tekrar çağrılırsa var olan worktree'yi döner (Claude Code'un ad yeniden kullanımı gibi).
import fs from "node:fs";
import path from "node:path";
import {
  BASE_BRANCH,
  branchForName,
  fail,
  git,
  listWorktrees,
  mainRoot,
  parseArgs,
  readStdinJson,
  run,
  worktreesDir,
} from "./lib.mjs";

const { flags, pos } = parseArgs(process.argv.slice(2));
const hook = Boolean(flags.hook);
const log = (s) => process.stderr.write(`${s}\n`);

let name = pos[0];
if (hook) name = (await readStdinJson()).name;
if (!name) fail("Kullanım: node tools/agents/wt-new.mjs <ad> [--base develop] [--no-install]");

const root = mainRoot();
const { slug, branch } = branchForName(name);
const dir = path.join(worktreesDir(root), slug);
const base = flags.base || BASE_BRANCH;

const existing = listWorktrees(root).find((w) => w.path.toLowerCase() === dir.toLowerCase());
if (existing) {
  log(`• Worktree zaten var: ${dir} (${existing.branch})`);
} else {
  if (fs.existsSync(dir)) fail(`${dir} var ama git worktree değil; elle kontrol edin.`);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const branchExists = git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: root, allowFail: true });
  if (branchExists) {
    log(`• ${branch} dalı zaten var, worktree ona bağlanıyor`);
    git(["worktree", "add", dir, branch], { cwd: root });
  } else {
    git(["rev-parse", "--verify", "--quiet", base], { cwd: root });
    git(["worktree", "add", "-b", branch, dir, base], { cwd: root });
    log(`✓ ${branch} ← ${base} (${git(["rev-parse", "--short", base], { cwd: root })})`);
  }

  // .worktreeinclude: ana checkout'taki gitignore'lu yerel dosyalar (ör. .env.local). Satır başına
  // bir göreli yol; # yorum. Glob desteklenmez, bilinçli: neyin kopyalandığı açık olsun.
  const includeFile = path.join(root, ".worktreeinclude");
  if (fs.existsSync(includeFile)) {
    for (const line of fs.readFileSync(includeFile, "utf8").split(/\r?\n/)) {
      const rel = line.trim();
      if (!rel || rel.startsWith("#")) continue;
      const src = path.join(root, rel);
      if (!fs.existsSync(src)) continue;
      fs.cpSync(src, path.join(dir, rel), { recursive: true });
      log(`  kopyalandı: ${rel}`);
    }
  }

  if (!flags["no-install"]) {
    log("• Bağımlılıklar kuruluyor (pnpm, çevrimdışı önbellek öncelikli)…");
    const res = await run("corepack", ["pnpm", "install", "--frozen-lockfile", "--prefer-offline"], { cwd: dir });
    if (res.code !== 0) {
      log(res.out.split(/\r?\n/).slice(-30).join("\n"));
      fail(`pnpm install başarısız (worktree duruyor: ${dir})`);
    }
    log("✓ Bağımlılıklar hazır");
  }
}

if (!hook) {
  log("");
  log(`Sonraki adım: bu klasörde çalışın → ${dir}`);
  log(`Bitince: node tools/agents/verify.mjs (worktree içinde), sonra commit ve rapor.`);
}
process.stdout.write(`${dir}\n`);
