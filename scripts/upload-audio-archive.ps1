<#
.SYNOPSIS
  Uploads the 604 page recitations to archive.org, which serves them to the
  Listen tab via VITE_AUDIO_BASE_URL.

.DESCRIPTION
  The recordings are ~2.47 GB — too large for the git repo or a free host's
  slug — so they are served from outside the deploy. archive.org is used
  because it needs no payment method, unlike R2 and B2.

  Run with -Pilot FIRST. It uploads a single page so the URL shape, playback
  and seeking can be confirmed in the app before committing to a multi-hour
  transfer of the whole Mus'haf.

  Note archive.org items are public and take effort to remove, so only upload
  recordings you are content to publish.

.EXAMPLE
  # 1. One file first — verify it plays in the app
  .\upload-audio-archive.ps1 -Identifier "hifz-app-ayman-suwayd-pages" -Pilot

  # 2. Then the rest
  .\upload-audio-archive.ps1 -Identifier "hifz-app-ayman-suwayd-pages"
#>
param(
  # Must be globally unique on archive.org and cannot be changed later.
  [Parameter(Mandatory = $true)] [string] $Identifier,
  [string] $Source = "C:\Users\ameen\OneDrive\Desktop\Apps\The Hifz App\Page Audio Recordings",
  [string] $Title  = "Qur'an page recitations (New Madani Mus'haf) - Ayman Suwayd",
  # Upload only page 1, to prove the pipeline before moving 2.47 GB.
  [switch] $Pilot
)

$ErrorActionPreference = 'Stop'

# pip installs the console script into a Scripts directory that is often not on
# PATH — notably under the Microsoft Store build of Python — so resolve it
# directly rather than relying on the shell finding it.
function Resolve-IaExe {
  $onPath = Get-Command ia -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }

  # pip reports where the package landed; the console script sits in a Scripts
  # directory alongside site-packages.
  $line = & pip show internetarchive 2>$null | Select-String '^Location:\s*(.+)$'
  if ($line) {
    $loc = $line.Matches[0].Groups[1].Value.Trim()
    $candidate = Join-Path (Split-Path $loc -Parent) 'Scripts\ia.exe'
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

$ia = Resolve-IaExe
if (-not $ia) {
  Write-Host "The archive.org CLI was not found. Run:" -ForegroundColor Yellow
  Write-Host "  pip install internetarchive" -ForegroundColor Cyan
  Write-Host "  ia configure" -ForegroundColor Cyan
  exit 1
}

# Uploading needs credentials; without them every call fails one by one.
$configured = @(
  (Join-Path $env:USERPROFILE '.config\internetarchive\ia.ini'),
  (Join-Path $env:USERPROFILE '.ia'),
  (Join-Path $env:APPDATA 'internetarchive\ia.ini')
) | Where-Object { Test-Path $_ }

if (-not $configured) {
  Write-Host "No archive.org credentials found. Run this first:" -ForegroundColor Yellow
  Write-Host "  `"$ia`" configure" -ForegroundColor Cyan
  Write-Host "It asks for the email and password of your archive.org account."
  exit 1
}

if (-not (Test-Path $Source)) { throw "Source folder not found: $Source" }

$files = Get-ChildItem $Source -Filter *.mp3 | Sort-Object Name
if ($files.Count -eq 0) { throw "No .mp3 files found in $Source" }

if ($Pilot) {
  $files = $files | Select-Object -First 1
  Write-Host "PILOT: uploading $($files[0].Name) only" -ForegroundColor Cyan
} else {
  $sizeGB = [math]::Round((($files | Measure-Object -Property Length -Sum).Sum / 1GB), 2)
  Write-Host "Uploading $($files.Count) files ($sizeGB GB) to item '$Identifier'" -ForegroundColor Cyan
  Write-Host "Re-running skips files already present, so an interrupted run is safe." -ForegroundColor DarkGray
}

$failed = @()
$n = 0
foreach ($f in $files) {
  $n++
  Write-Progress -Activity "Uploading to archive.org" `
                 -Status "$($f.Name)  ($n of $($files.Count))" `
                 -PercentComplete (($n / $files.Count) * 100)

  # Uploaded one file per call rather than as a folder: a single failure then
  # costs one retry instead of restarting the batch.
  #
  # stderr is discarded with 2>$null rather than merged with 2>&1: `ia` draws
  # its progress bar on stderr, and Windows PowerShell wraps merged native
  # stderr in ErrorRecords, which made a completely successful upload look
  # like a failure. Success is judged by exit code alone.
  & $ia upload $Identifier $f.FullName `
      --metadata="title:$Title" `
      --metadata="mediatype:audio" `
      --metadata="collection:opensource_audio" `
      --retries=3 2>$null | Out-Null

  if ($LASTEXITCODE -ne 0) {
    $failed += $f.Name
    Write-Host "  failed: $($f.Name)" -ForegroundColor Red
  }
}
Write-Progress -Activity "Uploading to archive.org" -Completed

if ($failed.Count -gt 0) {
  Write-Host "`n$($failed.Count) file(s) failed:" -ForegroundColor Red
  $failed | ForEach-Object { Write-Host "  $_" }
  Write-Host "Re-run the same command to retry only these." -ForegroundColor Yellow
  exit 1
}

$base = "https://archive.org/download/$Identifier"
Write-Host "`nUploaded $($files.Count) file(s)." -ForegroundColor Green
Write-Host "Test this URL in a browser (allow a minute for archive.org to process):" -ForegroundColor Yellow
Write-Host "  $base/$($files[0].Name)" -ForegroundColor Cyan
if ($Pilot) {
  Write-Host "`nIf it plays, re-run WITHOUT -Pilot to upload the rest." -ForegroundColor Yellow
} else {
  Write-Host "`nThen set on the host and redeploy:" -ForegroundColor Yellow
  Write-Host "  VITE_AUDIO_BASE_URL=$base" -ForegroundColor Cyan
}
