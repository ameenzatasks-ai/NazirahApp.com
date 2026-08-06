<#
.SYNOPSIS
  Uploads the 604 page recitations to S3-compatible object storage
  (Cloudflare R2, Backblaze B2, or any S3 API).

.DESCRIPTION
  The recordings are ~2.47 GB, which cannot live in the git repo or on a free
  host's slug, so they are served from object storage instead. The client
  points at them via VITE_AUDIO_BASE_URL.

  rclone is used rather than the provider's own CLI because it uploads in
  parallel and resumes: 604 sequential PUTs over a home connection is slow and
  fragile, and re-running this only transfers what is missing.

.EXAMPLE
  # Cloudflare R2
  .\upload-audio.ps1 `
      -AccessKeyId     "<r2 access key id>" `
      -SecretAccessKey "<r2 secret access key>" `
      -Endpoint        "https://<account-id>.r2.cloudflarestorage.com" `
      -Bucket          "hifz-audio"
#>
param(
  [Parameter(Mandatory = $true)] [string] $AccessKeyId,
  [Parameter(Mandatory = $true)] [string] $SecretAccessKey,
  # R2: https://<account-id>.r2.cloudflarestorage.com
  [Parameter(Mandatory = $true)] [string] $Endpoint,
  [Parameter(Mandatory = $true)] [string] $Bucket,
  [string] $Source = "C:\Users\ameen\OneDrive\Desktop\Apps\The Hifz App\Page Audio Recordings",
  # Raise only if your upload bandwidth is genuinely spare; too many parallel
  # transfers on a home line makes the whole batch slower, not faster.
  [int] $Transfers = 8
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
  Write-Host "rclone is not installed. Install it with:" -ForegroundColor Yellow
  Write-Host "  winget install Rclone.Rclone" -ForegroundColor Cyan
  Write-Host "then open a NEW terminal and run this script again."
  exit 1
}

if (-not (Test-Path $Source)) { throw "Source folder not found: $Source" }

$files = Get-ChildItem $Source -Filter *.mp3
if ($files.Count -eq 0) { throw "No .mp3 files found in $Source" }

$sizeGB = [math]::Round((($files | Measure-Object -Property Length -Sum).Sum / 1GB), 2)
Write-Host "Uploading $($files.Count) files ($sizeGB GB) to $Bucket" -ForegroundColor Cyan
Write-Host "This runs in the background and can be re-run safely." -ForegroundColor DarkGray

# Credentials are passed as flags rather than written to an rclone config file,
# so they are not left on disk afterwards.
rclone copy $Source ":s3:$Bucket" `
  --s3-provider        Other `
  --s3-access-key-id   $AccessKeyId `
  --s3-secret-access-key $SecretAccessKey `
  --s3-endpoint        $Endpoint `
  --s3-acl             private `
  --include            "*.mp3" `
  --transfers          $Transfers `
  --checkers           16 `
  --progress `
  --stats-one-line

if ($LASTEXITCODE -ne 0) { throw "rclone exited with code $LASTEXITCODE" }

Write-Host "`nVerifying remote file count..." -ForegroundColor Cyan
$remote = rclone size ":s3:$Bucket" `
  --s3-provider Other `
  --s3-access-key-id $AccessKeyId `
  --s3-secret-access-key $SecretAccessKey `
  --s3-endpoint $Endpoint

Write-Host $remote
Write-Host "`nDone. Expected $($files.Count) objects." -ForegroundColor Green
Write-Host "Next: set VITE_AUDIO_BASE_URL on the host to the bucket's public URL," -ForegroundColor Yellow
Write-Host "then redeploy so the value is baked into the client bundle." -ForegroundColor Yellow
