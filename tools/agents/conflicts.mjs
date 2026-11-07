// Conflict radarı: açık işlerin birbiriyle ve develop'la çakışıp çakışmayacağını, hiçbir dosyaya
// ve dala dokunmadan önceden hesaplar (git merge-tree, git ≥ 2.38).
//
//   node tools/agents/conflicts.mjs
//     Her açık dal için: develop'a rebase/merge çakışır mı; her dal çifti için: aynı dosyalara
//     dokunuyorlar mı, birleşince gerçekten çakışıyorlar mı.
//   node tools/agents/conflicts.mjs --files content/tr.json,src/app/globals.css
//     Henüz başlamamış bir işin dokunacağı dosyalar açık işlerle kesişiyor mu? (İş dağıtmadan önce.)
//   --json  makine okunur çıktı
//
// "Aynı dosya" uyarıdır (ayrı satırlarsa git kendisi birleştirir); "çakışma" kesindir.
import { execFileSync } from "node:child_process";
import { BASE_BRANCH, git, listWorktrees, mainRoot, parseArgs } from "./lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const root = mainRoot();
const branches = listWorktrees(root)
  .filter((w) => !w.main && w.branch)
  .map((w) => w.branch);

const changed = (branch) =>
  new Set(
    git(["diff", "--name-only", `${BASE_BRANCH}...${branch}`], { cwd: root })
      .split(/\r?\n/)
      .filter(Boolean),
  );

/** İki ref birleşirse çakışan dosyalar (boş dizi: temiz).
 *  merge-tree çıkış 0 = temiz, 1 = çakışma (stdout: ağaç kimliği + çakışan dosyalar), diğer = hata. */
function mergeConflicts(a, b) {
  try {
    execFileSync("git", ["merge-tree", "--write-tree", "--name-only", "--no-messages", a, b], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return [];
  } catch (err) {
    if (err.status !== 1) throw new Error(`git merge-tree ${a} ${b}: ${err.stderr || err.message}`);
    return String(err.stdout)
      .split(/\r?\n/)
      .slice(1) // ilk satır ağaç kimliği
      .map((l) => l.trim())
      .filter(Boolean);
  }
}

const files = new Map(branches.map((b) => [b, changed(b)]));
const result = { base: BASE_BRANCH, branches: [], pairs: [], planned: null };

for (const b of branches) {
  result.branches.push({ branch: b, files: files.get(b).size, conflictsWithBase: mergeConflicts(BASE_BRANCH, b) });
}
for (let i = 0; i < branches.length; i++) {
  for (let j = i + 1; j < branches.length; j++) {
    const [a, b] = [branches[i], branches[j]];
    const overlap = [...files.get(a)].filter((f) => files.get(b).has(f));
    result.pairs.push({ a, b, overlap, conflicts: overlap.length ? mergeConflicts(a, b) : [] });
  }
}
if (flags.files) {
  const planned = String(flags.files).split(",").map((f) => f.trim().replace(/\\/g, "/")).filter(Boolean);
  result.planned = branches
    .map((b) => ({ branch: b, overlap: planned.filter((f) => files.get(b).has(f)) }))
    .filter((r) => r.overlap.length);
}

if (flags.json) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(0);
}

// Yalnız dikkat isteyenler satır satır; temizler tek satırlık özet (--verbose ile hepsi).
const out = [];
const verbose = Boolean(flags.verbose);
if (!branches.length) out.push("Açık iş yok.");
let clean = 0;
for (const r of result.branches) {
  if (r.conflictsWithBase.length) out.push(`✗ ${r.branch} ↔ ${BASE_BRANCH}: ÇAKIŞIR → ${r.conflictsWithBase.join(", ")}  (worktree'de: git rebase ${BASE_BRANCH})`);
  else if (verbose) out.push(`✓ ${r.branch} ↔ ${BASE_BRANCH}: temiz (${r.files} dosya)`);
  else clean++;
}
for (const p of result.pairs) {
  if (p.conflicts.length) out.push(`✗ ${p.a} ↔ ${p.b}: ÇAKIŞIR → ${p.conflicts.join(", ")}  (sırayla birleştirin, ikincisi rebase etsin)`);
  else if (p.overlap.length) out.push(`• ${p.a} ↔ ${p.b}: aynı dosyalar, çakışma yok → ${p.overlap.join(", ")}`);
  else if (verbose) out.push(`✓ ${p.a} ↔ ${p.b}: ortak dosya yok`);
  else clean++;
}
if (clean) out.push(`✓ ${clean} karşılaştırma temiz (${branches.length} açık iş).`);
if (result.planned) {
  out.push("");
  if (!result.planned.length) out.push("✓ Planlanan dosyalar hiçbir açık işle kesişmiyor: paralel başlatılabilir.");
  else {
    out.push("⚠ Planlanan dosyalar açık işlerle kesişiyor (sıraya koymayı düşünün):");
    for (const r of result.planned) out.push(`  ${r.branch}: ${r.overlap.join(", ")}`);
  }
}
process.stdout.write(out.join("\n") + "\n");
