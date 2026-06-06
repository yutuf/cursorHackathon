---
title: Monumation Go Engine
emoji: 🏛️
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 8000
pinned: false
---

# Monumation Go Engine

Standalone Go scoring API for the Monumation hackathon demo.

| Endpoint | Method |
|----------|--------|
| `/health` | GET |
| `/monumation/normalize` | POST |
| `/monumation/scan` | POST |

Listens on port **8000** (`PORT` env). Free HF Spaces may sleep after ~1h idle — first request can take 20–40s to wake.
