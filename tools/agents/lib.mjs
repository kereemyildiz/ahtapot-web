// tools/agents/* script'lerinin ortak yardımcıları. Ayrıntı: tools/agents/README.md
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BASE_BRANCH = "develop";

/** git'i çalıştırır, çıktıyı kırpılmış metin olarak döner; hata verirse fırlatır. */
export function git(args, { cwd = process.cwd(), allowFail = false } = {}) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    if (allowFail) return null;
    const msg = (err.stderr || err.message || "").toString().trim();
    throw new Error(`git ${args.join(" ")}\n${msg}`);
  }
}

/** Ana checkout'un kökü (worktree içinden çağrılsa da). */
export function mainRoot(cwd = process.cwd()) {
  const common = path.resolve(cwd, git(["rev-parse", "--git-common-dir"], { cwd }));
  return path.dirname(common);
}

/** Worktree'lerin durduğu klasör: repo'nun YANINDA, içinde değil.
 *  İçinde olunca ana checkout'taki Turbopack her yazımı izliyor ve
 *  "dosya sistemi sakinleşsin" diye bekliyordu (ölçüldü, README → Neden repo dışı). */
export function worktreesDir(root = mainRoot()) {
  return path.join(path.dirname(root), `${path.basename(root)}.worktrees`);
}

/** `git worktree list --porcelain` → [{ path, head, branch, main }] */
export function listWorktrees(cwd = process.cwd()) {
  const out = git(["worktree", "list", "--porcelain"], { cwd });
  const items = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      cur = { path: path.normalize(line.slice(9)), head: null, branch: null };
      items.push(cur);
    } else if (cur && line.startsWith("HEAD ")) cur.head = line.slice(5);
    else if (cur && line.startsWith("branch ")) cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
  }
  items.forEach((w, i) => (w.main = i === 0));
  return items;
}

/** Ad, dal ya da yol verilen worktree'yi bulur. */
export function findWorktree(ref, cwd = process.cwd()) {
  const list = listWorktrees(cwd).filter((w) => !w.main);
  const norm = ref.replace(/\\/g, "/");
  return (
    list.find((w) => w.branch === norm) ||
    list.find((w) => path.normalize(w.path).toLowerCase() === path.resolve(ref).toLowerCase()) ||
    list.find((w) => path.basename(w.path) === norm) ||
    list.find((w) => w.branch && w.branch.split("/").pop() === norm) ||
    null
  );
}

/** "Fix-Animasyon kayması" → { slug: "animasyon-kaymasi", branch: "fix/animasyon-kaymasi" } */
export function branchForName(name) {
  const tr = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };
  let s = name
    .trim()
    .replace(/[çğıİöşü]/gi, (c) => tr[c] ?? tr[c.toLowerCase()] ?? c)
    .toLowerCase();
  let type = "feature";
  const m = s.match(/^(feature|fix)[/-](.+)$/);
  if (m) [, type, s] = m;
  const slug = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  if (!slug) throw new Error(`Geçersiz worktree adı: "${name}"`);
  return { slug, branch: `${type}/${slug}` };
}

/** Bu worktree'nin kendi git klasörü (doğrulama sonucu buraya yazılır, repo'ya girmez). */
export function gitDir(cwd = process.cwd()) {
  return path.resolve(cwd, git(["rev-parse", "--git-dir"], { cwd }));
}

export const VERIFY_FILE = "agents-verify.json";

export function readVerify(worktreePath) {
  const file = path.join(gitDir(worktreePath), VERIFY_FILE);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function isDirty(cwd) {
  return git(["status", "--porcelain"], { cwd }) !== "";
}

/** Komutu çalıştırır; çıktıyı toplar, istenirse canlı da basar.
 *  Windows'ta .cmd için shell gerekir; args boşsa cmd tam bir kabuk satırıdır (package.json script'i). */
export function run(cmd, args, { cwd = process.cwd(), echo = false, stream = process.stderr } = {}) {
  return new Promise((resolve) => {
    const shell = process.platform === "win32" || args.length === 0;
    const child = spawn(cmd, args, { cwd, shell, env: process.env });
    let out = "";
    const onData = (d) => {
      out += d;
      if (echo) stream.write(d);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
    child.on("error", (err) => resolve({ code: 1, out: out + String(err) }));
  });
}

export function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--") && ["base"].includes(k)) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { flags, pos };
}

export async function readStdinJson() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim() ? JSON.parse(data) : {};
}

/** Hata mesajını basıp çıkar. Hook modunda stdout'u kirletmemek için hep stderr. */
export function fail(msg, code = 1) {
  process.stderr.write(`✗ ${msg}\n`);
  process.exit(code);
}
