# Demo: static scan vs session forensics
# Run from mcp-sentinel/:  powershell -ExecutionPolicy Bypass -File scripts/demo-forensics.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..

Write-Host "`n=== 1. Tests ===" -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. Static scan (clean fixture) ===" -ForegroundColor Cyan
npm run scan -- fixtures/clean-setup -q

Write-Host "`n=== 3. Session forensics (suspicious fixture) ===" -ForegroundColor Cyan
npm run forensics -- fixtures/tap/suspicious-session.jsonl

Write-Host "`n=== 4. Session forensics (clean fixture) ===" -ForegroundColor Cyan
npm run forensics -- fixtures/tap/clean-session.jsonl

Write-Host "`n=== 5. Record live session via tap (optional, needs network) ===" -ForegroundColor Cyan
npm run record-session
if ($LASTEXITCODE -eq 0) {
  npm run forensics -- C:/Users/krish/mcp-session.jsonl
}

Write-Host "`nDemo complete." -ForegroundColor Green
Write-Host "Story: static scan can be clean while session forensics names real attack classes.`n"
