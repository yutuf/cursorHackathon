# Monumation — Jüri sunum scripti (~3 dk)

> **Canlı:** https://cursor-hackathon-phi.vercel.app/app  
> **Repo:** https://github.com/yutuf/cursorHackathon  
> Ekranda `/app` açık olsun. WiFi + Go engine uyanık olsun (önce bir kez Compare bas).

---

## [0:00] Açılış

“Merhaba, biz **Monumation**’ı sunuyoruz.

Google Haritalar size A’dan B’ye en kısa yolu verir. Ama o yol **istediğiniz hissi** vermeyebilir — asfalt, sanayi, generic sokak.

Monumation diyor ki: **Bu yürüyüş gerçekten tarihi mi, yeşil mi, sanat dolu mu, canlı mı?** Bunu skorluyoruz.”

---

## [0:25] Problem + kim için

“Problem: Yaya veya ziyaretçi rota seçerken **atmosferi** göremiyor.

Kim için: Şehirde yürüyen herkes — turist, yerel, şehir planlama demosu. Sadece İstanbul değil; Google Haritalar’ın olduğu her yerde çalışıyor.”

---

## [0:45] Çözüm — bir cümle

“Kullanıcı haritada başlangıç-bitiş seçiyor, **mood** seçiyor — heritage, scenic, arts veya promenade. Biz koridor boyunca landmark ve sokak görüntüsünü okuyup **mood skoru** veriyoruz.”

---

## [1:00] CANLI DEMO — Compare (30 sn)

*[Ekran: /app → örn. Heritage veya Promenade seç]*

“Önce **Corridor duel** — bu hackathon’un killer demosu.

**Compare**’e basıyorum. İki yol var:
- **Mood corridor** — Monumation’ın önerdiği koridor
- **Blind walk** — Google’ın vereceği fonksiyonel, gri yol

Görüyorsunuz: mood koridoru **belirgin şekilde yüksek** skor alıyor. Mesaj: **Rota seçimi önemli** — aynı şehir, farklı his.”

---

## [1:30] CANLI DEMO — Scan (45 sn)

*[Demo chip’e bas — örn. Sultanahmet veya Kadıköy Moda]*

“Şimdi tek koridor **Scan**.

İki pin → sistem yürüyüş rotasını çiziyor. Solda **mesafe, süre, detour** — pin koyar koymaz görüyorsunuz.

**Scan corridor**…

- Önce **street samples** — Street View’dan koridor dokusu
- Sonra **landmarks** — sadece **Google fotoğrafı olan** yerler; fotosuz POI göstermiyoruz, ViT’e anlamsız görüntü yollamıyoruz
- Üstte **engine live** — Go backend cloud’da, Hugging Face Spaces’te”

---

## [2:15] Teknik — 20 sn (soru gelirse)

“Pipeline kısa:
**Google** yürüyüş rotası + Places fotoğrafları + Street View örnekleri →
**Hugging Face** ViT ve DETR görüntüyü okur →
**Go Monumation Engine** etiketleri mood skoruna çevirir.

Yüz tanıma yok. Google zaten blur’luyor. Ham görüntü saklamıyoruz — KVKK dokümanı repo’da.”

---

## [2:35] AI-assisted development (zorunlu bölüm — 30 sn)

“Geliştirme kültürü:

Tüm hackathon **Cursor IDE**’de. Projeye **`.cursorrules`** yazdık — AI agent stack dışına çıkamıyor: masterfabric-go, KVKK, incremental commit.

GitHub’da **24 ayrı commit** var — tek seferlik zip yok. Jüri commit log’dan süreci görebilir.

**Cursor SDK**’yı da entegre ettik: tarama verisinden kısa **fırsat özeti metni** üreten agent — `npm run brief` ve bir API endpoint. Ana demo Monumation; SDK bonus entegrasyon.

README ve sunum PDF’i repo’da: `docs/pitch/MonumationPitchDeck.pdf`.”

---

## [2:55] Kapanış

“Özet: Google A→B çizer, Monumation **hangi yürüyüşün mood’a uyduğunu** söyler.

Canlı: cursor-hackathon-phi.vercel.app/app

Sorularınız?”

---

## Yedek — soru gelirse kısa cevaplar

| Soru | Cevap |
|------|--------|
| Street View nerede? | Tamamlayıcı katman; **ana sinyal Places fotoğrafları**. |
| HF hangi model? | `google/vit-base-patch16-224` + `facebook/detr-resnet-50`. |
| Go ne yapıyor? | ViT label’larını mood vektörüne normalize ediyor. |
| Denize pin? | Geocode + Street View snap + rota şekli — üç katman red. |
| Render/Koyeb? | Kart istedi; Go **Hugging Face Spaces**’te, site **Vercel**’de. |
| Claude kullandınız mı? | Hayır — **Cursor SDK**, Claude değil. |
| Expo? | Bu slice’ta yok; web + Go odaklıydık. |

---

## Demo öncesi checklist (sessizce)

- [ ] `/app` açık, engine live yeşil
- [ ] Compare bir kez basıldı (HF/Go uyandı)
- [ ] Demo chip hazır (Heritage veya Promenade en güvenilir)
- [ ] WiFi stabil
- [ ] PDF + repo linki hazır
