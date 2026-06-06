# Deploy — Vercel + Go (no credit card)

**Koyeb and Render now ask for payment.** Use **Hugging Face Spaces** for Go (free CPU tier, no card).

Live frontend: https://cursor-hackathon-phi.vercel.app/app

---

## 1) Go engine — Hugging Face Spaces (free)

### Create the Space (once)

1. [huggingface.co/new-space](https://huggingface.co/new-space)
2. **Space name:** `monumation-go` (or any name)
3. **SDK:** Docker
4. **Hardware:** CPU basic (free)
5. **Visibility:** Public
6. Create

### Publish from this repo

```powershell
$env:HF_SPACE = "YOUR_HF_USERNAME/monumation-go"
.\scripts\publish-hf-go.ps1
```

First push uses `git clone` of the Space repo, copies `backend/`, commits, pushes. HF rebuilds automatically.

### Test Go

After build finishes (2–5 min):

```
https://YOUR_USERNAME-monumation-go.hf.space/health
```

→ `{"status":"ok","engine":"monumation",...}`

**Cold start:** free Spaces sleep when idle. First request after sleep may take **20–40 seconds** — normal.

### Manual alternative (no script)

1. `git clone https://huggingface.co/spaces/YOUR_USERNAME/monumation-go`
2. Copy everything from `backend/` into that folder (includes `README.md` + `Dockerfile`)
3. `git add -A && git commit -m "deploy" && git push`

---

## 2) Vercel — connect Go

Vercel → **monumation** project → Settings → Environment Variables → Production:

| Key | Value |
|-----|--------|
| `GOOGLE_STREET_VIEW_API_KEY` | from `.env.local` |
| `HUGGINGFACE_API_KEY` | from `.env.local` |
| `MONUMATION_GO_URL` | `https://YOUR_USERNAME-monumation-go.hf.space` |

No trailing slash. Then **Deployments → Redeploy**.

### Verify

```
https://cursor-hackathon-phi.vercel.app/api/monumation/engine
```

→ `"configured":true`, `"goEngineOnline":true`

App: https://cursor-hackathon-phi.vercel.app/app → **engine live**

---

## Paid hosts (skip if no card)

| Host | Issue |
|------|--------|
| Koyeb | Paid / trial ended |
| Render | Credit card required |
| Fly.io | Card often required |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| HF build fails `go.mod not found` | Space repo must contain `backend/` files at **root** (use publish script) |
| `goEngineOnline: false` | Set `MONUMATION_GO_URL` on Vercel, redeploy |
| HF `/health` times out once | Space waking up — wait 30s, retry |
| Scan 504 on Vercel free | Use **Compare** for jury; or Vercel Pro for 60s functions |
| `configured: false` | `MONUMATION_GO_URL` missing on Vercel |
