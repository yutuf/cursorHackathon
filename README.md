# Monumation — Mood-Based Urban Navigation

**Kamu faydasına uygun** aesthetic routing for **Cursor Hackathon Istanbul** (June 6, 2026). Monumation helps tourists and pedestrians choose *which walk* matches their mood in Istanbul — heritage, scenic green, arts culture, or vibrant promenade — using Google Places, Hugging Face computer vision, and optional Street View corridor sampling.

> *"Google tells you what's there. Monumation scores how the corridor feels — and which path is worth your time."*

## Public benefit (Kamu Faydası)

| Pillar | Benefit |
|--------|---------|
| **Kültürel koridor yönlendirme** | Steers foot traffic toward heritage and arts corridors instead of overcrowding single landmarks |
| **Yerel esnaf** | Promenade routing surfaces café streets and bazaars, supporting neighborhood commerce |
| **Sürdürülebilir turizm** | Reduces random arterial walking — visitors pick mood-aligned paths with real POIs |
| **KVKK uyumu** | Vision on places and streetscape only — no face recognition or identity profiling |

## Live demo script (2 minutes)

1. Open the app → pick **Heritage Route**
2. Click **Compare Heritage Route** → show Sultanahmet corridor **~70+** vs Başakşehir strip **~30**
3. Click **Demo: Sultanahmet → Eminönü** → **Scan mood corridor**
4. Scroll to **Worth visiting** — point at a mosque/park photo with **Hugging Face: 65+/100**
5. Mention KVKK mask on Street View samples (supplementary layer)

## Tech stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| Web | Next.js 16 (App Router, TypeScript, Tailwind) | [Vercel](https://vercel.com) |
| Backend | Go — `masterfabric-go` (`backend/`) | [Render.com](https://render.com) |
| AI | Hugging Face ViT + DETR via HF router | Hugging Face |
| Maps | Google Directions, Places, Street View | Google Cloud |

## How it works

```
Mood selection → Google Directions (walking path)
       ↓
┌─────────────────────┬──────────────────────────┐
│ Google Places       │ Hugging Face on Places   │
│ (worth visiting)    │ photos (reliable CV)     │
└─────────────────────┴──────────────────────────┘
       ↓ optional
Street View samples (corridor texture, KVKK-masked)
       ↓
Combined corridor score + corridor battle compare
```

**Corridor battle** (`/api/monumation/compare`) — same mood, two paths, side-by-side scores. The demo killer for Istanbul.

## Getting started

**Terminal 1 — Go Monumation Engine (masterfabric-go):**

```bash
cd backend
go run ./cmd/monumation-api
# listens on http://localhost:8090 — look for [Monumation Engine] logs
```

**Terminal 2 — Next.js:**

```bash
npm install
cp .env.example .env.local   # add API keys
npm run dev
```

Or from repo root: `npm run go:monumation` (requires Go installed).

Open [http://localhost:3000](http://localhost:3000). Green badge = Go engine online.

### Environment variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_STREET_VIEW_API_KEY` | Google Maps Platform key (Directions, Places, Street View, Place Photos) |
| `HUGGINGFACE_API_KEY` | Hugging Face inference router (ViT + DETR) |
| `MONUMATION_GO_URL` | Go scoring engine (`http://localhost:8090` or Render URL) |
| `CURSOR_API_KEY` | Optional — Cursor SDK briefs |

Enable in Google Cloud: **Directions API**, **Places API**, **Street View Static API**.

## AI tooling (Cursor IDE)

Developed in **Cursor IDE** with agentic rules in [`.cursorrules`](.cursorrules):

- Monumation mood scoring matrix (`lib/monumation.ts`)
- Places photo vision pipeline (`lib/places-vision.ts`)
- Corridor compare presets (`lib/places-mood.ts`)
- Go Monumation engine mirror (`backend/internal/application/urbanscan/`)

| Stage | Technique | Outcome |
|-------|-----------|---------|
| Product pivot | Cursor Agent multi-turn | Bulan → Monumation with hybrid Places + CV |
| Vision mapping | Iterative label→token expansion | Istanbul-friendly ViT mapping + POI proximity boost |
| Demo presets | Corridor compare pairs | Reliable live demo without random scans |

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/monumation/compare` | Corridor battle — good vs weak path for selected mood |
| `POST /api/monumation/scan` | Full corridor scan — Places + photo AI + Street View samples |

## KVKK

- Models target **inanimate urban features** only (facades, signage, landmarks)
- Images pass KVKK pipeline gate before Hugging Face inference
- UI shows anonymized preview (blur badge) on all photos
- No face recognition, plate reading, or person profiling
- Post-event deletion commitment: [KVKK_DATA_DELETION.md](KVKK_DATA_DELETION.md)

## Go backend (masterfabric-go)

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Engine status |
| `POST /monumation/normalize` | Score HF labels → mood vector |
| `POST /monumation/scan` | Batch corridor scoring + KVKK mask count |

Next.js calls Go when `MONUMATION_GO_URL` is reachable; falls back to TypeScript scoring otherwise.

## Deploy

```bash
npm run build
npx vercel deploy --prod --yes
```

Required: `GOOGLE_STREET_VIEW_API_KEY`, `HUGGINGFACE_API_KEY`

## Learn more

- [Hackathon announcement](announcement.txt)
- [Hackathon rules](RULES.txt)
