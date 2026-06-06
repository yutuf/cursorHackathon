# Monumation — Walk any city by mood

Mood-based pedestrian routing for **Cursor Hackathon Istanbul** (June 6, 2026). Monumation scores walking corridors by vibe — heritage, scenic green, arts, or promenade — using **Google Places (photo-backed landmarks only)**, **Hugging Face vision**, optional **Street View** samples, and the **Go Monumation Engine**.

> *Google draws A→B. Monumation tells you which walk actually matches your mood.*

- **Landing:** `/`
- **Navigator:** `/app`

## What works today

| Feature | Status |
|---------|--------|
| Mood picker (4 corridors) | ✅ |
| Map pin → walking route scan | ✅ worldwide |
| Sea / non-walkable pin blocking | ✅ geocode + Street View snap + route shape |
| Places **with Google photos only** | ✅ no photo = not a landmark for CV |
| Hugging Face ViT on place photos | ✅ |
| Street View corridor samples | ✅ supplementary |
| Corridor battle (good vs weak) | ✅ preset demos |
| Go scoring engine | ✅ local or Render |

## Demo script (~2 min)

1. Open `/app` → pick a mood (e.g. **Heritage**)
2. **Compare** → good corridor scores higher than weak stretch
3. Tap a **demo chip** (Istanbul examples) or draw two pins on land
4. **Scan corridor** → street samples first, then landmark cards (all have photos)
5. Mention: Go engine + HF vision on **Google Places photos** (primary signal)

## Architecture

```
User picks mood → Google Walking Directions
        ↓
Google Places along route (photo-backed only)
        ↓
Hugging Face ViT on Place Photos  ← primary CV story
        ↓
Street View samples (optional texture layer)
        ↓
Go Monumation Engine normalizes mood vectors
        ↓
Combined score + corridor compare
```

## Local development

**Terminal 1 — Go engine:**

```bash
npm run go:monumation
# http://localhost:8090/health
```

**Terminal 2 — Next.js:**

```bash
npm install
cp .env.example .env.local   # fill API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Enter the navigator**.

Navigator shows `engine live` when Go is reachable.

## Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GOOGLE_STREET_VIEW_API_KEY` | Vercel | Directions, **Geocoding**, Places, Place Photos, Street View |
| `HUGGINGFACE_API_KEY` | Vercel | HF inference router (ViT + DETR) |
| `MONUMATION_GO_URL` | Vercel | Go engine URL (e.g. `https://monumation-go.onrender.com`) |
| `CURSOR_API_KEY` | Vercel | Optional — opportunity briefs |

**Google Cloud APIs to enable:** Directions, Geocoding, Places, Street View Static.

## Deploy — Vercel + Go on Render

### 1) Go backend on Render

**Option A — Blueprint:** connect repo → Render reads [`render.yaml`](render.yaml).

**Option B — Manual Web Service:**

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Runtime | Go |
| Build Command | `go build -o monumation-api ./cmd/monumation-api` |
| Start Command | `./monumation-api` |
| Health Check Path | `/health` |

Render sets `PORT` automatically (the Go binary listens on `PORT` or `MONUMATION_PORT`).

Copy the live URL, e.g. `https://monumation-go-xxxx.onrender.com`.

### 2) Next.js on Vercel

```bash
npm run build
npx vercel deploy --prod
```

Or connect [github.com/yutuf/cursorHackathon](https://github.com/yutuf/cursorHackathon) in the Vercel dashboard.

**Vercel → Project → Settings → Environment Variables:**

```
GOOGLE_STREET_VIEW_API_KEY=...
HUGGINGFACE_API_KEY=...
MONUMATION_GO_URL=https://monumation-go-xxxx.onrender.com
```

Redeploy after adding env vars. Open `/app` and confirm **engine live**.

> **Note:** Render free tier sleeps after inactivity — first request may take ~30s cold start.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/monumation/scan` | Full corridor scan |
| `POST /api/monumation/compare` | Corridor battle |
| `POST /api/monumation/validate` | Pin / route walkability check |
| `GET /api/monumation/engine` | Go engine health proxy |

## Go engine endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness |
| `POST /monumation/normalize` | HF labels → mood vector |
| `POST /monumation/scan` | Batch node scoring |

## Places policy

Only landmarks **with a Google photo** count toward scoring and UI. No photo → skipped (not worth showing to tourists or running ViT on).

## Privacy

- Uses Google imagery (faces/plates already blurred by Google)
- No face recognition, plate reading, or identity profiling
- No raw image storage
- See [KVKK_DATA_DELETION.md](KVKK_DATA_DELETION.md)

## Tech stack

| Layer | Tech | Host |
|-------|------|------|
| Web | Next.js 16, TypeScript, Tailwind | Vercel |
| Engine | Go `monumation-api` | Render / local |
| AI | Hugging Face ViT + DETR | HF API |
| Maps | Google Directions, Places, Street View | Google Cloud |

## Learn more

- [Hackathon announcement](announcement.txt)
- [Hackathon rules](RULES.txt)
