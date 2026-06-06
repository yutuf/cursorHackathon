# Publish backend/ to a Hugging Face Docker Space (free, no credit card).
# Usage: $env:HF_SPACE = "ykkymc/monumation-go"; .\scripts\publish-hf-go.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$Space = $env:HF_SPACE

if (-not $Space) {
    Write-Host "Set HF_SPACE first, e.g. ykkymc/monumation-go" -ForegroundColor Yellow
    exit 1
}

$Token = $env:HUGGINGFACE_API_KEY
if (-not $Token) {
    $EnvFile = Join-Path $ProjectRoot ".env.local"
    if (Test-Path $EnvFile) {
        $line = Get-Content $EnvFile | Where-Object { $_ -match '^HUGGINGFACE_API_KEY=' } | Select-Object -First 1
        if ($line) { $Token = ($line -split '=', 2)[1].Trim() }
    }
}
if (-not $Token) {
    Write-Host "HUGGINGFACE_API_KEY missing in .env.local" -ForegroundColor Red
    exit 1
}

$User = ($Space -split '/')[0]
$CacheDir = Join-Path $ProjectRoot ".hf-space-cache"
$RepoUrl = "https://" + $User + ":" + $Token + "@huggingface.co/spaces/" + $Space

if (-not (Test-Path (Join-Path $CacheDir ".git"))) {
    Write-Host ("Cloning huggingface.co/spaces/" + $Space + " ...") -ForegroundColor Cyan
    if (Test-Path $CacheDir) { Remove-Item -Recurse -Force $CacheDir }
    git clone $RepoUrl $CacheDir
} else {
    Set-Location $CacheDir
    git remote set-url origin $RepoUrl
    Set-Location $ProjectRoot
}

Write-Host "Syncing backend/ -> HF Space ..." -ForegroundColor Cyan
Get-ChildItem $CacheDir -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $BackendDir "*") -Destination $CacheDir -Recurse -Force

Set-Location $CacheDir
git remote set-url origin $RepoUrl
git add -A
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to publish." -ForegroundColor Green
    exit 0
}

git commit -m "sync: Monumation Go engine from cursorHackathon"
git push

$slug = $Space -replace "/", "-"
$hfUrl = "https://" + $slug + ".hf.space"
Write-Host ""
Write-Host "Published. Test after build (2-5 min):" -ForegroundColor Green
Write-Host ($hfUrl + "/health") -ForegroundColor Cyan
Write-Host ""
Write-Host "Vercel env:" -ForegroundColor Green
Write-Host ("MONUMATION_GO_URL=" + $hfUrl) -ForegroundColor Cyan
