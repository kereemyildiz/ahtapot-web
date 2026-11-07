// Bu repo'nun worktree'lerinden başlatılmış dev sunucularını listeler ve kapatır.
// Neden: bir agent kesilince açtığı `next dev` sahipsiz kalıyor (her biri ~300-900 MB); makine
// belleği bitiyordu. Ham `taskkill /PID` riskli (yanlış PID ilgisiz bir programı kapatır), bu
// script yalnız komut satırı bu repo'nun worktree klasöründe olan ve port dinleyen süreçlere dokunur.
//
//   node tools/agents/servers.mjs                       → liste (port, pid, MB, worktree, dal)
//   node tools/agents/servers.mjs --stop 3021,3022      → bu portlardaki sunucuları kapatır
//   node tools/agents/servers.mjs --stop agent-servers  → bu worktree'deki bütün sunucuları kapatır
//   node tools/agents/servers.mjs --stop-all            → bütün worktree sunucularını kapatır
// Ana checkout'ta (kullanıcının kendi `pnpm dev`'i) çalışan sunucular listelenir ama --stop-all ile
// kapatılmaz; ancak portu açıkça verilirse kapatılır.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fail, listWorktrees, mainRoot, parseArgs } from "./lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const root = mainRoot();
const worktrees = listWorktrees(root);
const norm = (p) => path.normalize(p).toLowerCase();

/** Windows: dinleyen port → pid (netstat), pid → komut satırı/ebeveyn/bellek (CIM). */
function processTable() {
  if (process.platform !== "win32") fail("Şimdilik yalnız Windows destekleniyor.");
  const listen = new Map(); // pid → [port]
  for (const line of execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" }).split(/\r?\n/)) {
    const m = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/);
    if (!m) continue;
    const [port, pid] = [Number(m[1]), Number(m[2])];
    if (!listen.has(pid)) listen.set(pid, new Set());
    listen.get(pid).add(port);
  }
  const ps = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe' or Name='cmd.exe'\" | Select-Object ProcessId,ParentProcessId,CommandLine,WorkingSetSize | ConvertTo-Json -Compress",
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const procs = [].concat(JSON.parse(ps || "[]"));
  return { listen, procs: new Map(procs.map((p) => [p.ProcessId, p])) };
}

function servers() {
  const { listen, procs } = processTable();
  const owned = worktrees
    .map((w) => ({ ...w, key: norm(w.path) + path.sep }))
    .sort((a, b) => b.key.length - a.key.length); // en uzun yol önce (ana checkout en son)
  const out = [];
  for (const [pid, ports] of listen) {
    const p = procs.get(pid);
    if (!p?.CommandLine) continue;
    const cmd = norm(p.CommandLine.replace(/"/g, ""));
    const wt = owned.find((w) => cmd.includes(w.key));
    if (!wt) continue; // bu repo'ya ait değil: dokunma
    // Kapatılacak kök: aynı worktree'den başlatılmış en üst ebeveyn (cmd.exe /c … sarmalayıcısı dahil).
    let rootPid = pid;
    for (let cur = procs.get(pid); cur; ) {
      const parent = procs.get(cur.ParentProcessId);
      if (!parent?.CommandLine || !norm(parent.CommandLine.replace(/"/g, "")).includes(wt.key.slice(0, -1))) break;
      rootPid = parent.ProcessId;
      cur = parent;
    }
    out.push({
      ports: [...ports].sort((a, b) => a - b),
      pid,
      rootPid,
      mb: Math.round((p.WorkingSetSize ?? 0) / 1024 / 1024),
      worktree: wt.main ? "(ana checkout)" : path.basename(wt.path),
      branch: wt.branch,
      main: wt.main,
    });
  }
  return out.sort((a, b) => a.ports[0] - b.ports[0]);
}

const list = servers();
const show = (rows) =>
  rows.length
    ? rows.map((s) => `  :${s.ports.join(",")}  pid ${s.pid}  ${s.mb} MB  ${s.worktree}  [${s.branch ?? "?"}]`).join("\n")
    : "  (yok)";

const stopArg = typeof flags.stop === "string" ? flags.stop : null;
if (!stopArg && !flags["stop-all"]) {
  console.log(`Bu repo'nun dev sunucuları:\n${show(list)}`);
  process.exit(0);
}

let targets;
if (flags["stop-all"]) targets = list.filter((s) => !s.main);
else {
  const keys = stopArg.split(",").map((k) => k.trim()).filter(Boolean);
  targets = list.filter((s) => keys.some((k) => s.ports.includes(Number(k)) || s.worktree === k || s.branch === k));
  const missing = keys.filter((k) => !list.some((s) => s.ports.includes(Number(k)) || s.worktree === k || s.branch === k));
  if (missing.length) console.log(`• Bu repo'ya ait sunucu bulunamadı: ${missing.join(", ")} (başka bir programsa dokunulmaz)`);
}
if (!targets.length) {
  console.log("Kapatılacak sunucu yok.");
  process.exit(0);
}
const kill = (pid) => {
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    // süreç zaten çıkmış olabilir; sonuç aşağıda porta bakılarak denetlenir
  }
};
for (const s of targets) {
  kill(s.rootPid);
  if (s.rootPid !== s.pid) kill(s.pid);
}
// taskkill'in çıkış koduna değil, portun gerçekten kapandığına bak.
const still = servers();
for (const s of targets) {
  const open = still.find((x) => x.pid === s.pid);
  console.log(
    open
      ? `✗ Kapatılamadı :${s.ports.join(",")}  pid ${s.pid} (${s.worktree})`
      : `✓ Kapatıldı :${s.ports.join(",")}  ${s.worktree} (${s.mb} MB)`,
  );
}
