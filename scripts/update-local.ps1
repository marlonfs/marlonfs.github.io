# Manual update: refreshes assets/publications.json (Google Scholar) and
# assets/research.json (FAPESP). Does NOT commit or push; do that yourself afterwards.
# Run from any folder:  powershell -File scripts\update-local.ps1
# Google Scholar blocks GitHub's servers (HTTP 403), so this must run from this machine.

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

# Each source runs independently: one failing does not block the other.
node scripts/update-publications.mjs
if ($LASTEXITCODE -ne 0) { Write-Output "Scholar update FAILED (publications.json left unchanged)." }
node scripts/update-research.mjs
if ($LASTEXITCODE -ne 0) { Write-Output "FAPESP update FAILED (research.json left unchanged)." }

git status --short assets/publications.json assets/research.json
