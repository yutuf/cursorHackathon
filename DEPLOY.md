# Deploy troubleshooting (Vercel + Go)

## Koyeb — exact clicks

1. [koyeb.com](https://www.koyeb.com) → GitHub login
2. **Create Web Service**
3. **GitHub** → `yutuf/cursorHackathon` → branch `main`
4. **Builder:** `Dockerfile`
5. **Work directory:** `backend` ← **critical** (without this, build fails: `go.mod not found`)
6. **Dockerfile:** `Dockerfile` (relative to work dir — not `backend/Dockerfile`)
7. **Exposed ports** (Settings → Networking):
   - Port: `8000`
   - Protocol: HTTP
   - Path: `/`
   - Public: yes
8. **Environment variables** (optional but safe):
   - `PORT` = `8000`
9. Deploy → wait green → copy URL: `https://YOUR-NAME.koyeb.app`
10. Test in browser: `https://YOUR-NAME.koyeb.app/health` → `{"status":"ok"}`

**One-click (pre-filled):**  
[Deploy Go to Koyeb](https://app.koyeb.com/deploy?type=git&repository=github.com/yutuf/cursorHackathon&branch=main&builder=dockerfile&workdir=backend&dockerfile=Dockerfile&name=monumation-go&ports=8000:http&routes=%2F:8000&env=PORT=8000)

If build fails, open **Logs** → look for `go build` error and paste in chat.

### Koyeb buildpack (no Docker)

If Docker fails, try:

- **Builder:** Buildpack
- **Root directory:** `backend`
- **Run command:** `./monumation-api` (after build) or leave auto
- **Port:** `8000`

---

## Vercel — exact clicks

1. [vercel.com](https://vercel.com) → Import `cursorHackathon`
2. **Root Directory:** leave empty (repo root)
3. **Environment Variables** (Production):

| Key | Value |
|-----|--------|
| `GOOGLE_STREET_VIEW_API_KEY` | from `.env.local` |
| `HUGGINGFACE_API_KEY` | from `.env.local` |
| `MONUMATION_GO_URL` | Koyeb URL, no trailing slash |

4. Deploy
5. Test: `https://YOUR.vercel.app/api/monumation/engine`  
   Should show `"goEngineOnline":true`

6. App: `https://YOUR.vercel.app/app`

**Your live Vercel URL:** https://cursor-hackathon-phi.vercel.app/app  
**Current issue:** `MONUMATION_GO_URL` is **not set** on Vercel → Go shows offline. Compare/Scan still work via Next.js fallback, but jury needs Go in cloud.

### Vercel scan timeout

Free hobby plan may cap serverless at **10s**. Scan uses 20–40s.

- **Compare** usually works on free tier
- **Scan** may 504 on free — use **Compare + demo chips** for jury, or enable Vercel Pro trial for 60s functions

---

## Hugging Face Spaces (backup, no card)

If Koyeb fails:

1. [huggingface.co/new-space](https://huggingface.co/new-space)
2. **Docker** space
3. Connect GitHub repo OR upload `backend/` folder
4. Dockerfile: use `backend/Dockerfile`
5. Space URL → `MONUMATION_GO_URL`

---

## Checklist when "both don't work"

| Check | URL / action |
|-------|----------------|
| Go alive? | `MONUMATION_GO_URL/health` |
| Vercel sees Go? | `your-app.vercel.app/api/monumation/engine` |
| Keys set? | Vercel → Settings → Environment Variables |
| Redeploy after env? | Deployments → Redeploy |
| MONUMATION_GO_URL has `https://`? | No `localhost` on Vercel |
