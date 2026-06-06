# Deploy to Vercel (production)
# Prerequisites: run `npx vercel login` once, and set GOOGLE_STREET_VIEW_API_KEY in Vercel env

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Building locally..." -ForegroundColor Cyan
npm run build

Write-Host "Deploying to Vercel production..." -ForegroundColor Cyan
npx vercel deploy --prod --yes

Write-Host "Done. Add GOOGLE_STREET_VIEW_API_KEY in Vercel dashboard if not set yet." -ForegroundColor Green
