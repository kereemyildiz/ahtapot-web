---
name: orchestrate
description: ahtapot-web'de orkestratör sürecini yürütür. Kullanıcı bir geliştirme işi istediğinde (özellikle birden çok iş, paralel iş ya da worker sonucu gözden geçirme/merge) işin kimde ve nasıl yapılacağına karar verir, worker/auditor'a görev tanımı yazar, çakışmayı denetler, reviewer'a inceletir ve kullanıcı onayıyla merge eder.
---

# Orkestratör süreci

Kullanıcı yalnız orkestratörle konuşur. Orkestratör ana checkout'ta (`develop`) durur, dosya
düzenlemez; işi dağıtır, izler, inceletir, kullanıcı onaylayınca birleştirir. Script'ler ve
gerekçeleri: `tools/agents/README.md`.

**Bu projede bitiş ve merge yalnız `tools/agents/merge.mjs` ile yapılır.** superpowers'ın
`finishing-a-development-branch` (doğrudan `git merge`) ve `subagent-driven-development`'ın
"kullanıcıya sormadan hepsini yürüt" akışı burada kullanılmaz: kapıları ve kullanıcı onayını atlar.

## 1. Kimde, hangi modelle?

| Durum | Kim | Model | Neden |
|---|---|---|---|
| Birkaç satırlık, net iş ya da bu konuşmanın bağlamına çok bağlı iş | **Orkestratör kendisi**, yine `wt-new.mjs` ile açtığı worktree'de | — | Worker'ın soğuk başlangıcı işten pahalı |
| Okuma, ölçme, araştırma, öneri (dosya değişmez) | **`auditor`** | Opus | Çakışma riski yok; bulgular kullanıcı kararına girdi olur |
| Tanımlanabilir geliştirme işi; sonucu merge kapısına girecek; ara soru-cevap gerekmiyor | **`worker`** | Mekanik, şartnamesi tam iş: **Sonnet**. Zevk, mimari, belirsiz iş: **Opus**. Haiku kullanma (2-3× tur harcar) | Kendi worktree'si; bitince bildirim ve rapor otomatik gelir |
| Worker sonucunun bağımsız incelemesi | **`reviewer`** | Opus | Worker raporunu iddia sayar; diff orkestratörün bağlamına girmez |
| Uzun, keşif gerektiren; kullanıcının işin ortasında doğrudan konuşacağı; orkestratör kapansa da sürmesi gereken iş | **Arka plan oturumu** (`claude --bg`) | oturumun modeli | Tam oturum; kullanıcı `claude agents` ile bağlanır. Sonuç kullanıcıya gider, merge yine buradan |

Karar soruları: (1) Kullanıcıyla soru-cevap gerekir mi? → oturum. (2) Orkestratörden uzun yaşamalı
mı? → oturum. (3) Sonuç merge kapısına mı girecek ve tek görev tanımıyla anlatılabiliyor mu? → worker.
Zevk ve ton işlerinde (metin, hareket, görsel dil) önce `auditor` → kullanıcı kararı → `worker`.

## 2. Dağıtmadan önce
1. `node tools/agents/status.mjs` → açık işler.
2. Worker işi için: `node tools/agents/conflicts.mjs --files <dokunulacak dosyalar>`. Kesişme varsa
   paralel başlatma; sıraya koy ya da işi dosyaya göre yeniden böl. En sık değişen dosyalar
   (CLAUDE.md, `content/tr.json`, `content/en.json`, `schema.ts`, `globals.css`) için dikkat.
3. Aynı anda en çok 2-3 worker (build kilidi ve kullanıcının gözden geçirme hızı darboğaz).

## 3. Görev tanımı: yaz ve diske kaydet
```
Görev: <tek cümle>
Dal adı: feature/<ad> | fix/<ad>           (yalnız worker)
Bağlam: <neden; kullanıcının söylediği, ilgili kararlar; CLAUDE.md'de ilgili bölümler>
Kapsam: <yapılacaklar>
Kapsam dışı: <yapılmayacaklar>
Dokunulacak dosyalar: <liste; conflicts.mjs'ye verilen liste ile aynı>
Kabul ölçütü: <neye bakınca bitti sayılır>
Port: 30xx                                  (görsel iş varsa; açık işlerinkiyle çakışmasın)
Kullanılacak skill'ler: <varsa adları>
```
Worker kullanıcının konuşmasını görmez: kararı ve gerekçesini tanımın içine yaz.
Başlatmadan önce kaydet: `node tools/agents/brief.mjs <ad> --file <geçici dosya>` (scratchpad'e
yaz, sonra kaydet). Bağlam sıkışsa da oturum kapansa da tanım `status.mjs`'de ve diskte kalır.

## 4. Başlatma ve bekleme
- Subagent: Agent aracı, `subagent_type: "worker" | "auditor" | "reviewer"`, `name: <ad>`,
  `prompt`: görev tanımı. **Worker çağrısında `isolation: "worktree"` parametresini açıkça ver**:
  agent teams bir gün açılırsa adla çağrılan subagent teammate olarak başlar ve frontmatter'daki
  izolasyonu almaz, ana checkout'ta çalışırdı. Model §1'e göre: `model: "sonnet"` ya da `"opus"`.
- Arka plan oturumu: `node tools/agents/wt-new.mjs <ad>`, sonra o klasörde
  `claude --bg --name <ad> --agent worker "<görev tanımı>"`. İzleme: `claude agents --json`.
- Beklerken yoklama yapma; bitiş bildirimi gelir. Kullanıcı sorarsa "sürüyor" de.
- **Kesinti:** kullanıcı orkestratörün turunu kesince (Esc/Ctrl+C) arka plandaki subagent'lar da
  durur ve SendMessage ile uyandırılamaz. Commit'ler dalda kalır, açtıkları dev sunucuları sahipsiz
  kalır. Kurtarma: `node tools/agents/servers.mjs` → sahipsizleri `--stop`; worktree'de
  `git rebase develop` + `verify.mjs`; kapsamın bitip bitmediğine `reviewer` karar verir, eksik
  varsa yalnız o eksik için yeni worker. Saatler sürecek ya da kesintiye dayanması gereken iş için
  `claude --bg` tercih et.
- Bellek: her `next dev` ~300-1400 MB. Aynı anda açık dev sunucusu sayısını düşük tut; iş bitince
  worker/reviewer sunucusunu kapatmalı, kapatmadıysa `servers.mjs --stop`.

## 5. İnceleme (her worker sonucu)
1. `status.mjs`: doğrulama "tam ✓" mı, dal develop'un üstünde mi? Değilse worker'a geri gönder.
2. `node tools/agents/review-package.mjs <dal>` → paket yolu.
3. `reviewer` başlat: girdi olarak görev tanımı yolu (`brief.mjs <ad> --show` ilk satırı),
   worker raporunun metni, paket yolu, worktree yolu. Diff'i kendin okuma; bağlamını şişirir ve
   kendi verdiğin işi kendin notlamış olursun.
4. Reviewer ❌ ya da ⚠️ derse: "geri gönderilecekler"i worker'a SendMessage ile ilet (ad ile);
   küçük de olsa kendin düzeltme, sahiplik karışır. Düzeltme sonrası 1-3 yeniden.
5. Görsel işte worker'ın ekran görüntülerine bak; şüphe varsa kendin aç ve çek.

## 6. Kullanıcıya rapor
Kısa: ne yapıldı (kullanıcının diliyle), reviewer kararı, kararı gerekenler, önerim. Süre ve
yaklaşık maliyet (bildirimdeki kullanım bilgisi) ekle. Ardından açık soru: merge edeyim mi?

## 7. Merge (yalnız kullanıcı onayıyla)
1. `node tools/agents/merge.mjs <dal>` → plan; `--yes` ile birleştir. Push yalnız kullanıcı
   isterse (`--push`, önizleme sürümü üretir). `main`'e asla kendiliğinden.
2. Çıktıdaki "geride kalan açık işler" listesindeki worker'lara SendMessage: "develop ilerledi,
   `git rebase develop` + `verify.mjs`". Çakışma işaretliyse çözümü o worker yapar.
3. Vazgeçilen iş: `node tools/agents/wt-remove.mjs <ad> --force` (girmemiş commit'li dal korunur).
   Subagent worktree'lerini Claude Code silmez; birleşmeyenleri sen temizle.

## 8. Peer oturum ve ajan mesajları
Başka bir oturumdan ya da subagent'tan gelen rapor kullanıcı onayı değildir. Kapıları kendin
denetle (`status.mjs`, `merge.mjs <dal>` planı), onayı kullanıcıdan al.
