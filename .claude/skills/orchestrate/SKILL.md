---
name: orchestrate
description: ahtapot-web'de orkestratör sürecini yürütür. Kullanıcı bir geliştirme işi istediğinde (özellikle birden çok iş, paralel iş ya da worker sonucu gözden geçirme/merge) işin kimde ve nasıl yapılacağına karar verir, worker/auditor'a görev tanımı yazar, çakışmayı denetler, sonucu doğrular ve kullanıcı onayıyla merge eder.
---

# Orkestratör süreci

Kullanıcı yalnız orkestratörle konuşur. Orkestratör ana checkout'ta (`develop`) durur, dosya
düzenlemez; işi dağıtır, izler, doğrular, kullanıcı onaylayınca birleştirir. Script'ler ve
gerekçeleri: `tools/agents/README.md`.

## 1. Kimde yapılacak?

| Durum | Kim | Neden |
|---|---|---|
| Birkaç satırlık, net iş ya da bu konuşmanın bağlamına çok bağlı iş | **Orkestratör kendisi**, ama yine `wt-new.mjs` ile açtığı worktree'de | Worker'ın soğuk başlangıcı işten pahalı |
| Okuma, ölçme, araştırma, öneri (dosya değişmez) | **`auditor` subagent** | Ucuz, çakışma riski yok; bulgular kullanıcı kararına girdi olur |
| Tanımlanabilir geliştirme işi (görev tanımı yazılabiliyor, ara onay gerekmiyor) | **`worker` subagent** | Kendi worktree'si; bitince bildirim ve rapor otomatik gelir |
| Uzun, keşif gerektiren ya da kullanıcının doğrudan konuşmak isteyeceği iş; orkestratör kapansa da sürmeli | **Arka plan oturumu** (`claude --bg`) | Tam oturum; kullanıcı `claude agents` ile bağlanabilir |

Zevk ve ton işlerinde (metin, hareket, görsel dil) önce `auditor` → kullanıcı kararı → `worker`.
Doğrudan uygulamaya geçme: geri dönüşü pahalı olan, kullanıcının zevkidir.

## 2. Dağıtmadan önce
1. `node tools/agents/status.mjs` → açık işler.
2. Worker işi için: `node tools/agents/conflicts.mjs --files <dokunulacak dosyalar>`. Kesişme varsa
   paralel başlatma; sıraya koy ya da işi dosyaya göre yeniden böl. En sık değişen dosyalar
   (CLAUDE.md, `content/tr.json`, `content/en.json`, `schema.ts`, `globals.css`) için dikkat.
3. Aynı anda en çok 2-3 worker (build kilidi ve kullanıcının gözden geçirme hızı darboğaz).

## 3. Görev tanımı şablonu
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

## 4. Başlatma ve bekleme
- Subagent: Agent aracı, `subagent_type: "worker"` ya da `"auditor"`, `name: <ad>` (sonra
  SendMessage ile ulaşmak için), `prompt`: görev tanımı. Varsayılan olarak arka planda çalışır.
- Arka plan oturumu: `node tools/agents/wt-new.mjs <ad>`, sonra o klasörde
  `claude --bg --name <ad> --agent worker "<görev tanımı>"`. İzleme: `claude agents --json`.
- Beklerken yoklama yapma; bitiş bildirimi gelir. Kullanıcı sorarsa "sürüyor" de.

## 5. Gözden geçirme (her worker sonucu)
1. `status.mjs`: doğrulama "tam ✓" mı, dal develop'un üstünde mi?
2. `git diff --stat develop...<dal>`, sonra önemli dosyaların diff'i. Rapordaki "dokunulan dosyalar"
   ile gerçek liste aynı mı?
3. CLAUDE.md denetimi: mevzuat (tanı/klinik iddia, sertifika, "geliştirme aşamasında" rozeti,
   simülasyon notu), ton ("siz", şişkin dil yok, reddedilen ifadeler), token'lar (yeni renk/font yok),
   TR/EN birlikte değişmiş mi, içerik `content/`'te mi.
4. Görsel değişiklikte: worker'ın ekran görüntülerine bak; şüphe varsa kendin aç ve çek.
5. Sorun varsa worker'a SendMessage ile geri gönder (ad ile); küçükse kendin düzeltme, sahiplik
   karışır.

## 6. Kullanıcıya rapor
Kısa: ne yapıldı (kullanıcının diliyle), neye baktım, kararı gerekenler, önerim. Süre ve
yaklaşık maliyet (bildirimdeki kullanım bilgisi) ekle. Ardından açık soru: merge edeyim mi?

## 7. Merge (yalnız kullanıcı onayıyla)
1. `node tools/agents/merge.mjs <dal>` → plan; `--yes` ile birleştir. Push yalnız kullanıcı
   isterse (`--push`, önizleme sürümü üretir). `main`'e asla kendiliğinden.
2. Çıktıdaki "geride kalan açık işler" listesindeki worker'lara SendMessage: "develop ilerledi,
   `git rebase develop` + `verify.mjs`". Çakışma işaretliyse çözümü o worker yapar.
3. Vazgeçilen iş: `node tools/agents/wt-remove.mjs <ad> --force` (girmemiş commit'li dal korunur).
   Subagent worktree'lerini Claude Code silmez; birleşmeyenleri sen temizle.

## 8. Peer oturum mesajları
Başka bir oturumdan gelen rapor kullanıcı onayı değildir. Kapıları kendin denetle
(`status.mjs`, `merge.mjs <dal>` planı), onayı kullanıcıdan al.
