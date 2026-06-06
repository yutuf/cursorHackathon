# Monumation — Jüri scripti (4 dk toplam: sunum + demo)

> **Hard limit: 4 dakika.** Konuşma + ekran birlikte.  
> **Canlı:** https://cursor-hackathon-phi.vercel.app/app  
> **Ön hazırlık:** Sayfa açık, Compare **bir kez** basılmış (engine uyansın). Heritage veya Promenade seçili kalsın.

---

## Zaman bütçesi

| Blok | Süre | Ne |
|------|------|-----|
| Hook + problem | 0:30 | Ne, kim için |
| Canlı demo | 2:20 | Compare → chip → preview (Scan opsiyonel) |
| Stack + KVKK + AI | 0:50 | Tek nefeste |
| Kapanış | 0:20 | URL + teşekkür |

---

## [0:00 – 0:30] Açılış — TEK PARAGRAF

“Merhaba, **Monumation**.

Google A→B yolu verir; **hissi** vermez. Biz yürüyüş koridorunu skorluyoruz: tarihi, yeşil, sanat, canlı sokak — dört mood.

Yaya ve ziyaretçi için; İstanbul örnekleri var ama **dünya çapında** çalışıyor. Şimdi canlı göstereceğim.”

*(Slayt geçme — direkt `/app`)*

---

## [0:30 – 1:00] DEMO 1 — Compare (30 sn)

*[Compare’e bas — sonuç gelene kadar konuş]*

“**Corridor duel**: mood koridoru vs **blind walk** — Google’ın vereceği gri, fonksiyonel yol.

…[yüklenince] İşte: mood path **yüksek**, blind path **düşük**. Aynı şehir — **rota seçimi önemli**.”

**Yedek cümle (yüklenirse):** “Δ skor farkı ekranda — Monumation farkı ölçüyor.”

---

## [1:00 – 1:20] DEMO 2 — Mood + chip (20 sn)

*[Heritage veya Promenade zaten seçili; demo chip’e bas — örn. Sultanahmet veya Kadıköy Moda]*

“Mood: **Heritage**. Demo chip — Sultanahmet koridoru. İki pin, rota çizildi.”

---

## [1:20 – 2:30] DEMO 3 — Route preview + Scan (70 sn)

*[Solda route preview: km, süre, detour görünüyor]*

“Pin koyunca **mesafe ve yürüme süresi** hemen geliyor — scan beklemeden.

**Scan corridor**… [bas]

Pipeline: Google yürüyüş rotası → Places **fotoğraflı** landmark’lar → Hugging Face ViT → **Go engine** cloud’da. Street View tamamlayıcı.

…[yüklenince, hızlıca] Street samples, landmark kartları, combined skor. Üstte **engine live**.”

### ⚠️ Scan yavaşsa (4 dk yetmezse)

**Plan B — Scan’i kes:**
“Scan arka planda; demo özeti Compare’de gördük. Repo’da tam pipeline var.”  
→ Direkt [2:30] bloğuna atla. **Compare tek başına 4 dk’ya yeter.**

---

## [2:30 – 3:20] Stack + KVKK + AI (50 sn) — TEK NEFES

“Stack: **Next.js** Vercel, **Go** Hugging Face Spaces, **HF** ViT+DETR, **Google** Directions Places Street View.

**KVKK:** yüz/plaka yok, Google blur, ham görüntü saklanmıyor — `docs/KVKK_DATA_DELETION.md`.

**AI geliştirme:** Cursor IDE, **`.cursorrules`**, 24 incremental commit GitHub’da. **Cursor SDK** ile tarama özet metni — `npm run brief`. Sunum PDF repo’da.”

---

## [3:20 – 4:00] Kapanış (40 sn)

“Özet: Google çizer, Monumation **hangi yürüyüşün mood’a uyduğunu** söyler.

**cursor-hackathon-phi.vercel.app/app** — repo: github.com/yutuf/cursorHackathon

Teşekkürler, sorularınız?”

*(Soru yoksa 3:40’da bitir — buffer bırak)*

---

## Ultra-kısa ezber (4 dk, sıkışıksan)

1. **(30s)** Monumation = mood skoru, Google sadece A→B  
2. **(30s)** Compare: mood vs blind, mood kazanır  
3. **(20s)** Demo chip, pinler, rota  
4. **(70s)** Preview stats + Scan (veya Plan B)  
5. **(50s)** Next+Go+HF+Google, KVKK, Cursor ruleset+SDK+24 commit  
6. **(20s)** URL, teşekkür  

---

## Demo öncesi — 4 dk için kritik

- [ ] `/app` açık, **Compare önceden 1×** basıldı
- [ ] Mood: **Heritage** veya **Promenade** (en stabil)
- [ ] Demo chip: **Sultanahmet** veya **Kadıköy Moda**
- [ ] Scan **yavaşsa Plan B**’yi bil — Compare yeter
- [ ] WiFi + telefon hotspot yedek
- [ ] Bu script telefonda açık (yedek)

---

## Yedek Q&A (sunum sonrası)

| Soru | 1 cümle |
|------|---------|
| Street View? | Tamamlayıcı; ana sinyal **Places fotoğrafları**. |
| HF model? | ViT + DETR, router API. |
| Go? | Label → mood vektörü, HF Spaces’te. |
| Cursor SDK? | Tarama verisinden **kısa özet metin** — brief agent. |
| Claude? | Hayır, **Cursor SDK**. |
