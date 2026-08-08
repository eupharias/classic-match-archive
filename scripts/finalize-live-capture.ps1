param([Parameter(Mandatory=$true)][string]$CaptureDir)

$latestPath = Join-Path $CaptureDir "latest.json"
$finalPath = Join-Path $CaptureDir "final.json"
$metadataPath = Join-Path $CaptureDir "capture-info.json"
if (-not (Test-Path $latestPath)) { throw "No latest snapshot exists in $CaptureDir" }

$raw = Get-Content -Raw $latestPath
$snapshot = $raw | ConvertFrom-Json
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $finalPath), $raw, [System.Text.UTF8Encoding]::new($false))
$gameEnd = $snapshot.events.Events | Where-Object EventName -eq "GameEnd" | Select-Object -Last 1
$info = [ordered]@{
  recoveredAt = (Get-Date).ToString("o")
  gameMode = $snapshot.gameData.gameMode
  mapName = $snapshot.gameData.mapName
  finalGameTime = $snapshot.gameData.gameTime
  result = $gameEnd.Result
  players = $snapshot.allPlayers.Count
  events = $snapshot.events.Events.Count
} | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $metadataPath), $info, [System.Text.UTF8Encoding]::new($false))
Write-Output "CAPTURE_RECOVERED $finalPath result=$($gameEnd.Result) gameTime=$([math]::Round([double]$snapshot.gameData.gameTime))"
