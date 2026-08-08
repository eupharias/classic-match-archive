param([string]$OutputRoot = "outputs/live-captures")

$ErrorActionPreference = "Continue"
$captureId = Get-Date -Format "yyyyMMdd-HHmmss"
$captureDir = Join-Path $OutputRoot $captureId
New-Item -ItemType Directory -Force -Path $captureDir | Out-Null
$latestPath = Join-Path $captureDir "latest.json"
$finalPath = Join-Path $captureDir "final.json"
$metadataPath = Join-Path $captureDir "capture-info.json"
$lastJson = $null
$successfulSamples = 0
$consecutiveFailures = 0
$startedAt = Get-Date

Write-Output "CAPTURE_STARTED $captureDir"

while (((Get-Date) - $startedAt).TotalHours -lt 3) {
  $raw = & curl.exe -k -sS --max-time 4 "https://127.0.0.1:2999/liveclientdata/allgamedata" 2>$null
  if ($LASTEXITCODE -eq 0 -and $raw) {
    try {
      $snapshot = $raw | ConvertFrom-Json
      $lastJson = $raw
      $successfulSamples++
      $consecutiveFailures = 0
      [System.IO.File]::WriteAllText((Join-Path (Get-Location) $latestPath), $raw, [System.Text.UTF8Encoding]::new($false))
      if ($successfulSamples -eq 1 -or $successfulSamples % 15 -eq 0) {
        $seconds = [math]::Round([double]$snapshot.gameData.gameTime)
        Write-Output "CAPTURE_OK samples=$successfulSamples gameTime=$seconds players=$($snapshot.allPlayers.Count)"
      }
    } catch {
      $consecutiveFailures++
    }
  } else {
    $consecutiveFailures++
  }

  if ($successfulSamples -gt 0 -and $consecutiveFailures -ge 10) { break }
  Start-Sleep -Seconds 2
}

if ($lastJson) {
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $finalPath), $lastJson, [System.Text.UTF8Encoding]::new($false))
  $final = $lastJson | ConvertFrom-Json
  $info = [ordered]@{
    captureId = $captureId
    startedAt = $startedAt.ToString("o")
    finishedAt = (Get-Date).ToString("o")
    samples = $successfulSamples
    gameMode = $final.gameData.gameMode
    mapName = $final.gameData.mapName
    finalGameTime = $final.gameData.gameTime
    players = $final.allPlayers.Count
  } | ConvertTo-Json
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $metadataPath), $info, [System.Text.UTF8Encoding]::new($false))
  Write-Output "CAPTURE_FINALIZED $finalPath samples=$successfulSamples gameTime=$([math]::Round([double]$final.gameData.gameTime))"
} else {
  Write-Output "CAPTURE_FAILED no valid snapshots"
  exit 1
}
