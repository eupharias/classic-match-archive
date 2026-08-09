$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $PSScriptRoot 'distributable'
$watcher = Join-Path $PSScriptRoot 'watch-live-classic.ps1'
$distRoot = Join-Path $repoRoot 'dist-recorder'
$archivePath = Join-Path $distRoot 'League-Classic-Match-Recorder-Windows.zip'
$stagingRoot = Join-Path (Join-Path $repoRoot 'work') ("recorder-package-" + [guid]::NewGuid().ToString('N'))
$packageRoot = Join-Path $stagingRoot 'League Classic Match Recorder'
$stagedArchive = Join-Path $stagingRoot 'League-Classic-Match-Recorder-Windows.zip'

if (-not (Test-Path -LiteralPath $watcher)) { throw "Watcher not found: $watcher" }
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse -Force
}
Copy-Item -LiteralPath $watcher -Destination (Join-Path $packageRoot 'watch-live-classic.ps1') -Force
Compress-Archive -LiteralPath $packageRoot -DestinationPath $stagedArchive -CompressionLevel Optimal
Copy-Item -LiteralPath $stagedArchive -Destination $archivePath -Force
Write-Output $archivePath
