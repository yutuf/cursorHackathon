# Publish backend/ to a Hugging Face Docker Space (free, no credit card).
# Prereqs: git, HF account, Space created at https://huggingface.co/new-space (SDK = Docker)
#
# Usage:
#   $env:HF_SPACE = "YOUR_USERNAME/monumation-go"
#   .\scripts\publish-hf-go.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$Space = $env:HF_SPACE

if (-not $Space) {
    Write-Host "Set HF_SPACE first, e.g.:" -ForegroundColor Yellow
    Write-Host '  $env:HF_SPACE = "yutuf/monumation-go"' -ForegroundColor Cyan
    exit 1
}

$CacheDir = Join-Path $ProjectRoot ".hf-space-cache"
$RepoUrl = "https://huggingface.co/spaces/$Space"

if (-not (Test-Path (Join-Path $CacheDir ".git"))) {
    Write-Host "Cloning $RepoUrl ..." -ForegroundColor Cyan
    if (Test-Path $CacheDir) { Remove-Item -Recurse -Force $CacheDir }
    git clone $RepoUrl $CacheDir
}

Write-Host "Syncing backend/ -> HF Space ..." -ForegroundColor Cyan
$Exclude = @(".hf-space-cache", "monumation-api.exe", "monumation-api", ".git")
Get-ChildItem $CacheDir -Force | Where-Object { $_.Name -notin $Exclude } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $BackendDir "*") -Destination $CacheDir -Recurse -Force

Set-Location $CacheDir
git add -A
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to publish." -ForegroundColor Green
    exit 0
}

git commit -m "sync: Monumation Go engine from cursorHackathon"
git push

$slug = $Space -replace "/", "-"
Write-Host ""
Write-Host "Published. Test after build (~2-5 min):" -ForegroundColor Green
Write-Host "  https://$slug.hf.space/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vercel env:" -ForegroundColor Green
Write-Host "  MONUMATION_GO_URL=https://$slug.hf.space" -ForegroundColor Cyan
