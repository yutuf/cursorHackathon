# Sunum context dump — AI-assisted development kültürü

> Monumation / Cursor Hackathon Istanbul — 6 Haziran 2026  
> Jüri için: **AI Adaptasyonu (%10)** + **Dokümantasyon (%5)** + commit disiplini  
> Canlı demo: https://cursor-hackathon-phi.vercel.app/app

---

## 1. Tek cümle (slayt açılışı)

**“Kodu tek başımıza yazmadık — Cursor IDE + agentic ruleset ile hackathon stack’ine kilitli bir AI pair-programmer kullandık; her özellik incremental commit, KVKK ve masterfabric-go kuralları agent tarafından zorlandı.”**

---

## 2. AI-assisted development kültürümüz — 4 sütun

| Sütun | Ne yaptık | Kanıt |
|-------|----------|-------|
| **Agentic ruleset** | AI’ın stack dışına çıkmasını engelledik | `.cursorrules`, `docs/RULES.txt` |
| **Şeffaf süreç** | Tek seferlik zip yok — 24 anlamlı commit | `git log` on GitHub |
| **AI ürün içinde** | Cursor SDK ile brief agent | `@cursor/sdk`, `npm run brief` |
| **Belgelendirme** | README + KVKK + deploy + bu dosya | `README.md`, `docs/` |

---

## 3. Geliştirme akışı (slayt diyagramı)

```
Hackathon brief (announcement.txt + RULES.txt)
        ↓
.cursorrules yüklenir → Cursor Agent her oturumda aynı kurallar
        ↓
İnsan: ürün kararı + demo senaryosu + pin test
        ↓
Agent: kod yazar, build/test, deploy, README günceller
        ↓
İnsan: jüri demosu, skor kalibrasyonu, sunum
        ↓
feat:/fix:/docs: commit → GitHub (jüri commit log’a bakar)
```

**Mesaj:** AI hızlandırıcı; mimari karar ve demo kalitesi ekipte.

---

## 4. Cursor Ruleset — ne zorladı?

Dosya: [`.cursorrules`](../.cursorrules) (158 satır, 7 bölüm)

| Kural | Agent’a etkisi | Üründe görünen sonuç |
|-------|------------------|----------------------|
| masterfabric-go only | Custom Go mimarisi yasak | `backend/cmd/monumation-api`, `urbanscan` |
| Hugging Face only | Model kaynağı sabit | ViT + DETR `lib/huggingface.ts` |
| KVKK pipeline | Yüz/plaka yasak, blur önce | `lib/kvkk.ts`, `docs/KVKK_DATA_DELETION.md` |
| Incremental commits | Bulk upload yasak | 24 commit, conventional messages |
| Minimize scope | Dev günü kurtaran küçük diff’ler | Compare fix 5 dosya, preview 4 dosya |
| README şeffaflığı | AI tooling dokümante | README “AI development” bölümü |

**Backend’de ek agent kuralları:** `backend/.cursor/rules/*.mdc`, `backend/.cursor/AGENTS.md` — Go hexagonal yapıya uyum.

---

## 5. Cursor SDK — ürüne entegre (ekstra puan maddesi)

**Claude değil — Cursor SDK (`@cursor/sdk` v1.0.18)**

| Parça | Dosya | Ne yapar |
|-------|-------|----------|
| Wrapper | `lib/cursor-agent.ts` | `Agent.prompt()`, model `composer-2.5` |
| API | `POST /api/opportunity-brief` | Belediye / girişimci brief üretir |
| CLI | `npm run brief` | Terminalden agent çalıştırma |
| Fallback | `lib/opportunity-brief.ts` | Key yoksa şablon brief |

**Local vs cloud:** Geliştirmede local agent; Vercel’de `CURSOR_API_KEY` + `GITHUB_REPO_URL` ile cloud agent.

**Sunumda söyle:** Ana demo Monumation (`/app`); SDK = “AI adaptasyonunun ürün içi kanıtı” (Bulan brief modülü).

---

## 6. Commit tarihçesi — süreç kanıtı (özet)

**24 commit** — `yutuf/cursorHackathon` — conventional commits:

| Faz | Örnek commit | AI + insan işi |
|-----|--------------|----------------|
| Scaffold | `feat: Next.js street view route scanner` | Agent scaffold, insan API key |
| Bulan | `feat: Bulan storefront scanner` | İş fikri → agent implement |
| Pivot Monumation | `feat: Monumation scoring pipeline` | Ürün pivot, ruleset güncellendi |
| Go engine | `fix: compile Go Monumation engine` | Agent + local `go build` |
| UI/UX | `feat: mood-themed UI, landing page` | Jüri feedback → agent polish |
| Deploy | `feat: HF Spaces deploy` | Render/Koyeb kart → agent alternatif |
| Demo fix | `fix: corridor compare scoring` | Canlı test → agent kalibrasyon |
| Dokümantasyon | `docs: Cursor Ruleset and SDK in README` | Hackathon şartı |

**Jüri cümlesi:** “Commit log sunumumuzun ikinci ekranı — AI ile nasıl iterasyon yaptığımızı gösterir.”

---

## 7. Prompt / agent steering teknikleri (somut örnekler)

Sunumda “nasıl yönettik” diye anlat:

1. **Stack kilidi** — “masterfabric-go dışına çıkma, `cmd/monumation-api` kullan” → agent custom backend yazmadı.
2. **KVKK guardrail** — “Yüz tanıma ekleme, Google blur yeter” → pipeline gate, ek blur kaldırıldı.
3. **Demo-first** — “Compare’de mood path kazanmalı, 14 vs 13 kabul edilemez” → scoring refactor.
4. **Deploy constraint** — “Kart yok, Render yasak, HF Spaces” → Dockerfile + publish script.
5. **Minimize scope** — “Sadece compare scoring, UI’ya dokunma” → odaklı PR’lar.
6. **Incremental git** — Her milestone sonrası commit+push (kullanıcı talebi agent rule’a işlendi).

---

## 8. AI × ürün ayrımı (jüri sorusu hazırlığı)

| Katman | AI aracı | Görev |
|--------|----------|-------|
| **Geliştirme** | Cursor IDE + Ruleset | Kod, deploy, fix, README |
| **Geliştirme** | Cursor SDK | Opportunity brief agent |
| **Runtime ürün** | Hugging Face ViT + DETR | Koridor görüntü sınıflandırma |
| **Runtime ürün** | Go Monumation Engine | Label → mood vektörü |
| **Runtime ürün** | Google Maps APIs | Rota, Places, Street View |

**Kritik:** Jüriye “her şeyi ChatGPT yazdı” demiyoruz — **kurallı agent + HF vision + Go scoring**.

---

## 9. Önerilen sunum slaytları (AI bölümü — 3–4 dk)

### Slayt A — “AI ile nasıl geliştirdik?”
- Cursor IDE zorunlu (RULES.txt)
- `.cursorrules` = agent constitution
- 24 incremental commit

### Slayt B — Ruleset içeriği (screenshot)
- `.cursorrules` açık — KVKK + stack + commit bölümleri
- `backend/.cursor/rules/` — Go conventions

### Slayt C — Cursor SDK entegrasyonu
- Kod snippet: `lib/cursor-agent.ts` → `Agent.prompt()`
- `npm run brief` terminal screenshot (opsiyonel)

### Slayt D — GitHub commit timeline
- `git log --oneline` screenshot
- feat → fix → docs döngüsü

### Slayt E — AI adaptation özeti
- Geliştirme: Cursor Ruleset + SDK ✅
- Runtime: HF + Go ✅
- Claude SDK ❌ (kullanılmadı — doğru bilgi)

---

## 10. Konuşma metni

> **Güncel tam script (4 dk):** [`PRESENTATION_SCRIPT.md`](PRESENTATION_SCRIPT.md)

### Eski özet (60–90 sn) — AI bölümü only

> “Hackathon boyunca geliştirme ortamımız Cursor IDE’ydi. Projeye `.cursorrules` ile bir agent constitution yazdık: masterfabric-go dışına çıkmak, yüz tanıma eklemek veya tek seferlik kod yüklemek agent tarafından yasaklandı. Bu sayede AI hızlandırıcı oldu ama stack ve KVKK kırmızı çizgileri korundu.
>
> GitHub’da 24 anlamlı commit var — scaffold’tan Monumation’a, Go engine’den Vercel+HF Spaces deploy’a kadar her adım ayrı commit. Jüri compare demosunda skorların ters çıktığını görünce agent’a odaklı fix verdik; bir gecede scoring ve blind-vs-mood karşılaştırmasını düzelttik.
>
> Ürün içinde de AI adaptasyonu var: `@cursor/sdk` ile opportunity brief agent’ı entegre ettik — `npm run brief` ve API endpoint. Ana demo Monumation ama SDK entegrasyonu hackathon’un istediği CLI/SDK bonusunu karşılıyor.
>
> Özet: AI kod fabrikası değil — kurallı pair programmer. Vision runtime’da Hugging Face, scoring Go’da, geliştirme kültürü Cursor’da belgelendi.”

---

## 11. Form / jüri checkbox hatırlatması

| Madde | Durum |
|-------|--------|
| Cursor Ruleset | ✅ `.cursorrules` + `docs/RULES.txt` |
| Cursor SDK | ✅ `@cursor/sdk` entegre |
| Claude CLI/SDK | ❌ Kullanılmadı |
| README AI bölümü | ✅ |
| Pitch deck repo’da | ✅ `docs/pitch/MonumationPitchDeck.pptx` |
| KVKK belgelendi | ✅ `docs/KVKK_DATA_DELETION.md` |
| Canlı demo | ✅ `/app` |

---

## 12. Linkler (slayt footer)

- App: https://cursor-hackathon-phi.vercel.app/app
- Repo: https://github.com/yutuf/cursorHackathon
- Go health: https://ykkymc-monumation-go.hf.space/health
- Pitch PDF: `docs/pitch/MonumationPitchDeck.pdf`
