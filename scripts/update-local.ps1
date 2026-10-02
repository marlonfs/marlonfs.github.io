# Updates assets/publications.json (Google Scholar) and assets/research.json (FAPESP)
# from this machine, then commits and pushes. Run by the Windows scheduled task
# "marlonfs-site-update" every 15 days, or manually: powershell -File scripts\update-local.ps1
# Google Scholar blocks GitHub's servers (HTTP 403), so this must run from a regular connection.

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$log = Join-Path $repo "scripts\update-local.log"
Start-Transcript -Path $log -Force | Out-Null

git pull --ff-only
if ($LASTEXITCODE -ne 0) { Write-Output "git pull failed; aborting."; Stop-Transcript | Out-Null; exit 1 }

# Each source runs independently: one failing does not block the other.
node scripts/update-publications.mjs
if ($LASTEXITCODE -ne 0) { Write-Output "Scholar update FAILED (publications.json left unchanged)." }
node scripts/update-research.mjs
if ($LASTEXITCODE -ne 0) { Write-Output "FAPESP update FAILED (research.json left unchanged)." }

git add assets/publications.json assets/research.json
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "Update publications and research (local run)"
  git push
} else {
  Write-Output "No changes to commit."
}

Stop-Transcript | Out-Null
