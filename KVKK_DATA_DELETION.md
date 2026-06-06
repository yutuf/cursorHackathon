# KVKK Data Handling & Deletion Commitment

**Project:** Monumation — Cursor Hackathon Istanbul, June 6, 2026  
**Team:** [Your team name]

## Scope

Monumation processes **public urban imagery** (Google Places photos, optional Street View samples) for **inanimate scene classification only**.

## Prohibited processing

- Face recognition or person identification
- License plate reading
- Individual profiling or tracking

## Anonymization pipeline

1. Street View and Places images pass through a **KVKK gate** before Hugging Face inference (`lib/kvkk.ts`, Go `ApplyKVKVMask`).
2. Accidental faces and vehicle plates are blurred **before** model execution (placeholder in hackathon build; documented for jury).
3. Raw base64 images are **not** committed to git or stored in persistent databases.

## Data retention

| Data type | Retention |
|-----------|-----------|
| Raw Street View / Places images | Session only — not persisted |
| API keys | `.env.local` / Vercel secrets only |
| Scan JSON responses | Ephemeral — user browser session |

## Post-hackathon deletion (June 6, 2026)

We commit to:

- [ ] Delete all local `.env.local` test images and scan exports
- [ ] Revoke or rotate hackathon API keys if no longer needed
- [ ] Confirm no raw imagery remains in GitHub repository history from demo exports
- [ ] Document completion in team channel / README

**Signed:** _________________________ **Date:** _________________________
