# Bulan AI — Neighborhood Revitalization Index

**Kamu faydasına uygun** (public-benefit) urban economic mapping for the **Cursor Hackathon Istanbul** (June 6, 2026). Bulan transforms public Street View imagery into an automated neighborhood revitalization index — helping municipalities prevent small-business bankruptcies, map localized supply gaps, and activate vacant storefronts with **100% KVKK compliance**.

> *"Bulan AI takes public spatial images and transforms them into an automated neighborhood revitalization index, helping municipalities prevent small business bankruptcies and map localized economic supply gaps with 100% KVKK compliance."*

### Why this serves the public interest (20 pts: Kamu Faydası)

| Pillar | Public benefit |
|--------|----------------|
| **Esnaf koruması** | Steers entrepreneurs away from saturated streets, protecting life savings and preventing commercial blight |
| **Akıllı kent planlama** | Flags neighborhoods missing critical services so municipalities can target grants and infrastructure |
| **Atıl alanların kazanımı** | Maps Kiralık/Satılık banners to reconnect vacant storefronts with new businesses and employment |
| **KVKK uyumlu inovasyon** | Signboards and rental banners only — no surveillance, identity profiling, or person tracking |

This repository hosts the Next.js web app, Go backend (`backend/`), and planned Expo mobile components.

## Tech Stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| Web | Next.js 16 (App Router, TypeScript, Tailwind CSS) | [Vercel](https://vercel.com) |
| Backend | Go (Golang) — _to be added_ | [Render.com](https://render.com) |
| Mobile | Expo — _to be added_ | Expo |
| External API | Google Street View API (10,000 free requests) | Google Cloud |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production build

```bash
npm run build
npm run start
```

### Environment variables

Copy the example file and add your API keys locally (never commit real keys):

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_STREET_VIEW_API_KEY` | Google Street View Static API key |
| `HUGGINGFACE_API_KEY` | Hugging Face router API for storefront classification |
| `CURSOR_API_KEY` | Cursor SDK agent for AI opportunity briefs |
| `GITHUB_REPO_URL` | Repo URL for cloud Cursor agents on Vercel (optional) |

## AI Tooling & Adaptation

This project is developed in **Cursor IDE** with an agentic ruleset defined in [`.cursorrules`](.cursorrules). The ruleset enforces:

- Next.js App Router patterns optimized for Vercel deployment
- KVKK compliance (no identity detection; mandatory face/plate anonymization)
- Incremental, descriptive Git commits
- Google Street View API as the sole external imagery source

### How AI accelerated development

| Stage | AI technique | Outcome |
|-------|--------------|---------|
| Project init | `create-next-app` via Cursor Agent with hackathon-aligned defaults | Next.js 16 scaffold with TypeScript, Tailwind, ESLint, and App Router in minutes |
| Architecture guidance | `.cursorrules` agentic ruleset | Consistent stack choices (Next.js + Go + Expo) and KVKK guardrails baked into every agent session |
| Documentation | Agent-generated README sections | Transparent AI adaptation log for jury scoring |

### Cursor SDK integration (extra hackathon points)

Bulan uses the official **[Cursor SDK](https://cursor.com/docs/sdk/typescript)** (`@cursor/sdk`) to turn raw scan data into a readable **opportunity brief** for entrepreneurs.

| Integration | File | What it does |
|-------------|------|--------------|
| In-app button | `app/api/opportunity-brief/route.ts` | After a scan, calls `Agent.prompt()` to write a verdict, risks, and next steps |
| CLI script | `scripts/generate-brief.ts` | Run `npm run brief` locally for demos or CI |
| Shared prompt | `lib/opportunity-brief.ts` | Builds the agent prompt from corridor stats + detections |
| SDK wrapper | `lib/cursor-agent.ts` | Local agent in dev, cloud agent on Vercel |

**Setup**

1. Create an API key at [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations)
2. Add to `.env.local`:
   ```bash
   CURSOR_API_KEY=cursor_...
   ```
3. Scan a corridor in the app, then click **Generate AI brief (Cursor SDK)**

**CLI demo (good for jury presentation)**

```bash
npm run brief
# or with exported scan JSON:
npm run brief -- ./my-scan.json
```

**Prompt technique:** We use the one-shot `Agent.prompt()` pattern — scan results are serialized into a structured prompt with opportunity counts, competitor detections, and sign text. The agent returns a markdown brief with `## Verdict`, `## Best opportunities`, `## Competition risk`, and `## Next steps`. No manual report writing.

**Runtime:** Local `npm run dev` uses a **local Cursor agent** (fast). Production on Vercel falls back to a **cloud agent** or template if the key is missing.

## Planned Integrations

- **Go backend** — Urban object detection API (signboards, road damage, public infrastructure)
- **Expo mobile** — Cross-platform field data collection
- **Google Street View API** — Street-level imagery ingestion (quota-aware)
- **KVKK pipeline** — Irreversible face and license plate anonymization before any model processing

## KVKK & Data Privacy

- Models are used **only** for urban object detection — identity profiling is prohibited
- Human faces and vehicle plates must be anonymized **before** processing
- Raw unencrypted data must not be uploaded to public repositories
- All API keys must be stored in `.env.local` (gitignored)

## Deploy on Vercel

**Live production:** https://cursor-hackathon-phi.vercel.app

Redeploy after changes:

```bash
npx vercel deploy --prod --yes
```

Required Vercel environment variables: `GOOGLE_STREET_VIEW_API_KEY`, `HUGGINGFACE_API_KEY`  
Optional for AI briefs: `CURSOR_API_KEY`, `GITHUB_REPO_URL`

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Hackathon announcement](announcement.txt)
- [Hackathon rules](RULES.txt)
