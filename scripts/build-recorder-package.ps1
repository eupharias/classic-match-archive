$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $PSScriptRoot 'distributable'
$watcher = Join-Path $PSScriptRoot 'watch-live-classic.ps1'
$distRoot = Join-Path $repoRoot 'dist-recorder'
$packageRoot = Join-Path $distRoot 'League Classic Match Recorder'
$archivePath = Join-Path $distRoot 'League-Classic-Match-Recorder-Windows.zip'

if (-not (Test-Path -LiteralPath $watcher)) { throw "Watcher not found: $watcher" }
if (Test-Path -LiteralPath $distRoot) { Remove-Item -LiteralPath $distRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse -Force
}
Copy-Item -LiteralPath $watcher -Destination (Join-Path $packageRoot 'watch-live-classic.ps1') -Force
Compress-Archive -LiteralPath $packageRoot -DestinationPath $archivePath -CompressionLevel Optimal
Write-Output $archivePath
