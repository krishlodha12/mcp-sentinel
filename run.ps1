# Run npm commands even when Node isn't on PATH yet.
# Usage: .\run.ps1 ui
#        .\run.ps1 scan fixtures/vulnerable-setup

$nodeDir = "C:\Program Files\nodejs"
$npm = Join-Path $nodeDir "npm.cmd"

if (-not (Test-Path $npm)) {
    Write-Host "Node.js not found. Run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
    exit 1
}

$env:Path = "$nodeDir;$env:Path"
Set-Location $PSScriptRoot

if ($args.Count -eq 0) {
    Write-Host "Usage: .\run.ps1 <npm-script> [args...]"
    Write-Host "  .\run.ps1 ui"
    Write-Host "  .\run.ps1 scan fixtures/vulnerable-setup"
    exit 1
}

$script = $args[0]
$rest = @()
if ($args.Count -gt 1) { $rest = $args[1..($args.Count - 1)] }

& $npm run $script @rest
exit $LASTEXITCODE
