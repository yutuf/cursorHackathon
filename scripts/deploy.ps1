# Deploy to Vercel (production)
# Prerequisites:
#   1. Run `npx vercel login` once
#   2. Set env vars in Vercel dashboard:
#      - GOOGLE_STREET_VIEW_API_KEY
#      - HUGGINGFACE_API_KEY

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "Linting..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) {
    throw "Lint failed. Fix errors before deploying."
}

Write-Host "Building locally..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

Write-Host "Deploying to Vercel production..." -ForegroundColor Cyan
npx vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) {
    throw "Vercel deploy failed."
}

Write-Host "Done. Production URL should appear above." -ForegroundColor Green
Write-Host "Ensure GOOGLE_STREET_VIEW_API_KEY and HUGGINGFACE_API_KEY are set in Vercel." -ForegroundColor Yellow
