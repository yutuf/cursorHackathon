# Start Monumation Go engine (masterfabric-go) on http://localhost:8090
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Set-Location $BackendDir

$goCmd = Get-Command go -ErrorAction SilentlyContinue
if (-not $goCmd) {
    Write-Host "Go not found. Install: winget install GoLang.Go" -ForegroundColor Red
    exit 1
}

Write-Host "Building Monumation API..." -ForegroundColor Cyan
go build -o monumation-api.exe ./cmd/monumation-api
if ($LASTEXITCODE -ne 0) {
    throw "Go build failed"
}

Write-Host "[Monumation Engine] starting on http://localhost:8090" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
& .\monumation-api.exe
