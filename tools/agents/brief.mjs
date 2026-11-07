// Görev tanımını diske yazar / okur. Orkestratörün bağlamı sıkıştırılsa ya da oturum kapansa da
// işin tanımı kaybolmasın (Beads'in hafif karşılığı: veritabanı yok, repo'ya girmez).
// Yer: <ortak git klasörü>/agents/<anahtar>/brief.md  (anahtar: dal adının son parçası)
//
//   node tools/agents/brief.mjs <ad|dal> < tanim.md     → yazar (stdin)
//   node tools/agents/brief.mjs <ad|dal> --file tanim.md → yazar (dosyadan)
//   node tools/agents/brief.mjs <ad|dal> --show          → yolu ve içeriği basar
// İlk "Görev: …" satırı status.mjs'de işin başlığı olarak görünür.
import fs from "node:fs";
import path from "node:path";
import { fail, parseArgs, taskDir } from "./lib.mjs";

const { flags, pos } = parseArgs(process.argv.slice(2));
if (!pos[0]) fail("Kullanım: node tools/agents/brief.mjs <ad|dal> [--file f.md | --show] (yoksa stdin)");
const file = path.join(taskDir(pos[0]), "brief.md");

if (flags.show) {
  if (!fs.existsSync(file)) fail(`Görev tanımı yok: ${file}`);
  process.stdout.write(`${file}\n\n${fs.readFileSync(file, "utf8")}`);
  process.exit(0);
}

let text;
if (typeof flags.file === "string") text = fs.readFileSync(flags.file, "utf8");
else {
  text = "";
  for await (const chunk of process.stdin) text += chunk;
}
if (!text.trim()) fail("Boş görev tanımı.");
if (!/^Görev:/m.test(text)) process.stderr.write("• Uyarı: 'Görev: …' satırı yok; status.mjs başlık gösteremez.\n");
fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
process.stdout.write(`${file}\n`);
