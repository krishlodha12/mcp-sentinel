# One-time setup for Windows when `npm` is not recognized.
# Run from the mcp-sentinel folder:  powershell -ExecutionPolicy Bypass -File .\setup.ps1

$nodePath = "C:\Program Files\nodejs"

if (-not (Test-Path "$nodePath\npm.cmd")) {
    Write-Host "Node.js not found at $nodePath" -ForegroundColor Red
    Write-Host "Install it: winget install OpenJS.NodeJS.LTS"
    exit 1
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*nodejs*") {
    $updated = if ([string]::IsNullOrEmpty($userPath)) { $nodePath } else { "$userPath;$nodePath" }
    [Environment]::SetEnvironmentVariable("Path", $updated, "User")
    Write-Host "Added Node.js to your user PATH. Restart the terminal after this script finishes."
}

$env:Path = "$nodePath;$env:Path"

Set-Location $PSScriptRoot
Write-Host "Installing dependencies..."
& npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Your current terminal still has the old PATH." -ForegroundColor Yellow
Write-Host "Either close and reopen PowerShell, OR run this line now:" -ForegroundColor Yellow
Write-Host '  $env:Path += ";C:\Program Files\nodejs"' -ForegroundColor Cyan
Write-Host ""
Write-Host "Or skip PATH entirely — use the wrapper:" -ForegroundColor Green
Write-Host "  .\run.ps1 ui"
Write-Host "  .\run.ps1 scan fixtures/vulnerable-setup"
