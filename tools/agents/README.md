# tools/agents — paralel çalışma için worktree script'leri

Kullanıcı tek bir oturumla (**orkestratör**) konuşur. Orkestratör işi böler, her işi bir
**worker**'a (subagent ya da `claude --bg` oturumu) kendi git worktree'sinde yaptırır, sonucu
doğrular ve kullanıcı onaylayınca `develop`'a birleştirir. Bu klasördeki script'ler bu sürecin
deterministik adımlarıdır: model *ne* yapılacağına karar verir, *nasıl* yapılacağı buradadır.

## Script'ler

| Script | Nerede çalışır | Ne yapar |
|---|---|---|
| `wt-new.mjs <ad>` | herhangi bir yerde | `ahtapot-web.worktrees/<ad>` worktree'sini `develop`'tan açar, dal `feature/<ad>` (`fix-…` ile başlarsa `fix/<ad>`), `.worktreeinclude` dosyalarını kopyalar, `pnpm install` |
| `verify.mjs [--quick]` | worktree içinde | lint → typecheck → test → build; sonucu commit SHA'sıyla kaydeder |
| `status.mjs [--json]` | herhangi bir yerde | açık worktree'ler: develop'a göre önde/geride, kirli mi, son commit, doğrulama, merge'e hazır mı |
| `merge.mjs <ad> [--yes] [--push] [--keep]` | ana checkout | kapıları denetler, planı gösterir; `--yes` ile `--no-ff` birleştirir, worktree'yi ve dalı siler, geride kalan açık işleri (ve çakışacak olanları) listeler |
| `wt-remove.mjs <ad> [--force]` | ana checkout | worktree'yi siler; dal yalnız `develop`'a girmişse silinir |
| `conflicts.mjs [--files a,b] [--verbose]` | herhangi bir yerde | conflict radarı: açık dalların develop'la ve birbirleriyle çakışıp çakışmayacağını `git merge-tree` ile önceden hesaplar; `--files` ile henüz başlamamış bir işin dosyalarını açık işlerle karşılaştırır |
| `brief.mjs <ad> [--file f \| --show]` | herhangi bir yerde | görev tanımını ortak git klasörüne (`.git/agents/<ad>/brief.md`) yazar/okur; `status.mjs` "Görev:" satırını gösterir |
| `review-package.mjs <ad>` | herhangi bir yerde | dalın commit'leri, değişen dosyaları ve diff'ini tek dosyaya yazar; reviewer okur, diff orkestratörün bağlamına girmez |
| `servers.mjs [--stop <port\|worktree> \| --stop-all]` | herhangi bir yerde | bu repo'nun worktree'lerinden başlatılmış dev sunucularını listeler/kapatır (yalnız komut satırı bu repo'da olan ve port dinleyen süreçler; ana checkout'takini `--stop-all` kapatmaz). `wt-remove.mjs` silmeden önce o worktree'nin sunucusunu kendisi kapatır. Neden: auto mode ham `taskkill /PID`'i haklı olarak engelliyor (yanlış PID ilgisiz programı kapatır); bu script aynı işi dar kapsamda yapar ve `node tools/agents/*` izin kuralıyla önceden onaylıdır |

## Roller

| Rol | Ne | Tanım |
|---|---|---|
| Orkestratör | Kullanıcının konuştuğu oturum; dağıtır, izler, inceletir, onayla birleştirir | `.claude/skills/orchestrate/SKILL.md` |
| `worker` | Dosya değiştiren iş; kendi worktree'sinde, sabit rapor biçimiyle | `.claude/agents/worker.md` |
| `auditor` | Salt okunur denetim/araştırma; dosya değiştiremez, bulgu + uygulama planı yazar | `.claude/agents/auditor.md` |
| `reviewer` | Worker sonucunun bağımsız incelemesi; raporu iddia sayar, şartname + CLAUDE.md denetler, ✅/⚠️/❌ | `.claude/agents/reviewer.md` |

**Dışarıdan alınanlar** (araştırma: 2026-11-08): bağımsız inceleme ajanı ve "raporu doğrulanmamış iddia
say" ilkesi superpowers'ın subagent-driven-development'ından; görev tanımını diske yazmak Beads'in ve
firstmate'in "durum diskte" ilkesinden (veritabanı olmadan); scout/ship ayrımı (auditor/worker)
firstmate ve Simon Willison'dan; doğrulanmış ağacın birleşmesi Gas Town Refinery'nin merge kuyruğu
ilkesinden. Bilinçli olarak alınmayanlar: Gas Town/Beads (tmux/WSL, 20-30 ajan ölçeği, ikinci durum
deposu), agent teams (worktree izolasyonu yok), tmux/macOS isteyen TUI/masaüstü araçlar, konteyner
izolasyonu.

Kural ve süreç metni CLAUDE.md'de değil skill ve agent dosyalarında: yalnız gerektiğinde yüklenir,
her oturum her açılışta token olarak ödemez.

`wt-new.mjs --hook` ve `wt-remove.mjs --hook`, Claude Code'un `WorktreeCreate` / `WorktreeRemove`
hook'larıdır (aşağıda). Böylece subagent izolasyonu (`isolation: worktree`), `claude --worktree`,
`EnterWorktree` ve arka plan oturumları da worktree'yi aynı yerde ve aynı kurallarla açar.

## Bir işin akışı

**Worker** (kendi worktree'sinde):
1. Görev tanımını okur (hedef, kapsam dışı, dokunulacak dosyalar, kabul ölçütü).
2. Geliştirir, commit eder (CLAUDE.md kuralları geçerli).
3. `node tools/agents/verify.mjs` → geçene kadar düzeltir.
4. Orkestratöre kısa rapor: dal, ne değişti, doğrulama satırı, açık sorular. **Merge etmez.**

**Orkestratör** (ana checkout, `develop`):
1. `node tools/agents/status.mjs` → kim ne durumda (git'ten, hafızadan değil).
2. Diff'i inceler; görsel değişiklikse worktree'de dev sunucusu açıp ekran görüntüsü alır.
3. Kullanıcıya özet + öneri. Onay gelirse:
4. `node tools/agents/merge.mjs <ad>` (plan) → `--yes` (birleştir) → kullanıcı isterse `--push`.

## Merge kapıları (merge.mjs)

1. Ana checkout `develop`'ta ve temiz.
2. Worktree temiz.
3. Dalın **ucu** için tam doğrulama kaydı var ve geçmiş. Doğrulamadan sonra yeni commit atılırsa kayıt "eski" sayılır.
4. `develop` dalın atası (dal `develop`'un son hâlinin üstünde). Böylece birleşen ağaç doğrulanan
   ağacın ta kendisi olur: iki iş ayrı ayrı geçip birlikte bozulamaz. Değilse worktree'de
   `git rebase develop` → `verify.mjs` → tekrar.

## Tasarım kararları ve ölçümler

**Neden worktree'ler repo'nun içinde değil, yanında (`ahtapot-web.worktrees/`)?**
Claude Code varsayılan olarak `.claude/worktrees/` altına açar. Ölçtük: ana klasörde çalışan
`next dev` (Turbopack) iç içe klasördeki her yazımı görüyor ve "dosya sistemi sakinleşsin" diye
bekliyor (3000 dosya yazımında birkaç saniye takıldı). Worktree'de `pnpm install` ya da `next build`
olduğu sürece ana checkout'taki önizleme takılırdı. Ayrıca `tsconfig` (`**/*.ts`) ve ESLint iç içe
worktree'leri de tarardı; ikisine de yedek olarak `.claude` hariç tutması eklendi.

**Neden varsayılan taban `develop`?** Claude Code'un kendi worktree'leri `origin/main`'den dallanır
(`worktree.baseRef: "fresh"`); bizim entegrasyon dalımız `develop`. Hook bunu da çözer.

**Neden build kilidi?** `next build` birkaç GB bellek kullanıyor; paralel worker'lar aynı anda
build alınca makine zorlanıyordu. `verify.mjs` build adımını ortak git klasöründeki
`agents-build.lock` ile sıraya koyar (sahibi ölmüş kilit otomatik temizlenir).

**Neden `pnpm run` değil?** Başta bu makinede pnpm yalnız `corepack pnpm` ile vardı; pnpm 11
`run`'dan önce bağımlılık denetimi yapıp PATH'teki `pnpm`'i çağırıyor ve `'pnpm' is not
recognized` ile düşüyordu. Çözüm: `corepack enable --install-directory "%APPDATA%\npm" pnpm`
(yönetici gerektirmez, `packageManager` sürümüne sabit). `verify.mjs` yine de komutları
`package.json`'dan okuyup `node_modules/.bin` ile doğrudan çalıştırır: PATH'e bağımlı değil ve
her adımda pnpm'in açılış + denetim süresini harcamaz.

**Neden kısa çıktı?** Worker'ın bağlamına binlerce satır log girmesin: geçen adım tek satır,
kalan adımın son 40 satırı.

**Doğrulama kaydı nerede?** Worktree'nin kendi git klasöründe (`.git/worktrees/<ad>/agents-verify.json`).
Repo'ya girmez, worktree silinince kaybolur.

## Claude Code hook kurulumu

`.claude/settings.json`'da (proje ayarı). Auto mode, Claude'un kendi ayar dosyasına hook
yazmasını kullanıcı izniyle bile engelliyor; bu dosyayı kullanıcı değiştirir.

```json
"hooks": {
  "WorktreeCreate": [{ "hooks": [{ "type": "command",
    "command": "node \"${CLAUDE_PROJECT_DIR}/tools/agents/wt-new.mjs\" --hook",
    "timeout": 300 }] }],
  "WorktreeRemove": [{ "hooks": [{ "type": "command",
    "command": "node \"${CLAUDE_PROJECT_DIR}/tools/agents/wt-remove.mjs\" --hook",
    "timeout": 120 }] }]
}
```

Bilinen davranış: subagent bitince Claude Code, hook'un açtığı worktree'yi silmez
(doküman: "Remove those worktrees yourself"). `merge.mjs` birleştirdikten sonra siler; vazgeçilen
iş için `wt-remove.mjs`.
