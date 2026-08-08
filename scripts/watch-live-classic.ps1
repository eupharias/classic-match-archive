param(
  [string]$OutputRoot = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'League Classic Match Captures'),
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'live-capture.config.json'),
  [string]$SnapshotPath,
  [string]$GameId,
  [switch]$Once
)

$ErrorActionPreference = 'Continue'
if (-not $SnapshotPath) {
  $otherRecorder = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match '-File\s+[^\r\n]*watch-live-classic\.ps1' } | Select-Object -First 1
  if ($otherRecorder) { Write-Output "League Classic recorder is already running (PID $($otherRecorder.ProcessId))."; exit 0 }
}
$endpoint = 'https://127.0.0.1:2999/liveclientdata/allgamedata'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$positionMap = @{ TOP='Top'; JUNGLE='Jungle'; MIDDLE='Mid'; BOTTOM='Bot'; UTILITY='Support' }

if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Capture config not found: $ConfigPath" }
$config = Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json
$playerMap = @{}
$config.players.psobject.Properties | ForEach-Object { $playerMap[$_.Name.ToLowerInvariant()] = [string]$_.Value }
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$logPath = Join-Path $OutputRoot 'recorder.log'

function Write-RecorderLog([string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Message"
  Add-Content -LiteralPath $logPath -Value $line
  Write-Output $line
}

function Get-LiveSnapshot {
  $raw = & curl.exe -k -sS --max-time 3 $endpoint 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $raw) { return $null }
  try { return ($raw | ConvertFrom-Json) } catch { return $null }
}

function Get-LeagueGameId {
  try {
    $client = Get-CimInstance Win32_Process -Filter "Name = 'LeagueClientUx.exe'" -ErrorAction Stop | Select-Object -First 1
    if (-not $client) { return $null }
    $portMatch = [regex]::Match([string]$client.CommandLine, '--app-port=([0-9]+)')
    $tokenMatch = [regex]::Match([string]$client.CommandLine, '--remoting-auth-token=([^\s"]+)')
    if (-not $portMatch.Success -or -not $tokenMatch.Success) { return $null }
    $sessionRaw = & curl.exe -k -sS --max-time 3 -u "riot:$($tokenMatch.Groups[1].Value)" "https://127.0.0.1:$($portMatch.Groups[1].Value)/lol-gameflow/v1/session" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $sessionRaw) { return $null }
    $session = $sessionRaw | ConvertFrom-Json
    $resolved = [string]$session.gameData.gameId
    if ($resolved -and $resolved -ne '0') { return $resolved }
  } catch { return $null }
  return $null
}

function Export-MatchJson($Snapshot, [datetime]$StartedAt, [string]$LeagueGameId) {
  $players = @($Snapshot.allPlayers)
  $gameEnd = @($Snapshot.events.Events | Where-Object EventName -eq 'GameEnd') | Select-Object -Last 1
  $captureId = $StartedAt.ToString('yyyyMMdd-HHmmss')
  $captureDir = Join-Path $OutputRoot $captureId
  New-Item -ItemType Directory -Force -Path $captureDir | Out-Null

  $hasBots = @($players | Where-Object { $_.isBot -eq $true }).Count -gt 0
  $isClassicRift = $Snapshot.gameData.gameMode -eq 'JADE' -and [int]$Snapshot.gameData.mapNumber -eq 453
  if ($hasBots -or -not $isClassicRift) {
    $reason = if ($hasBots) { 'AI match ignored' } else { 'Non-Classic-Rift match ignored' }
    Write-RecorderLog "$reason (mode=$($Snapshot.gameData.gameMode), map=$($Snapshot.gameData.mapNumber))"
    return $null
  }

  $activeName = [string]$Snapshot.activePlayer.riotIdGameName
  $activePlayer = $players | Where-Object { $_.riotIdGameName -ieq $activeName } | Select-Object -First 1
  if (-not $activePlayer) { throw 'Could not identify the active player in the final snapshot.' }
  $allyTeam = [string]$activePlayer.team
  $recognized = @($players | Where-Object { $_.team -eq $allyTeam -and $playerMap.ContainsKey(([string]$_.riotIdGameName).ToLowerInvariant()) })
  if (-not $recognized.Count) {
    Write-RecorderLog 'No configured archive players were found on the active player team; no match.json created.'
    return $null
  }

  $durationSeconds = if ($gameEnd) { [double]$gameEnd.EventTime } else { [double]$Snapshot.gameData.gameTime }
  $result = if ([string]$gameEnd.Result -match '^Win') { 'Win' } else { 'Loss' }
  $performances = @($recognized | ForEach-Object {
    [ordered]@{
      player = $playerMap[([string]$_.riotIdGameName).ToLowerInvariant()]
      gamer_tag = [string]$_.riotIdGameName
      champion = [string]$_.championName
      role = if ($positionMap.ContainsKey([string]$_.position)) { $positionMap[[string]$_.position] } else { [string]$_.position }
      kills = [int]$_.scores.kills
      deaths = [int]$_.scores.deaths
      assists = [int]$_.scores.assists
      cs = [int][math]::Round([double]$_.scores.creepScore)
      vision = [int][math]::Round([double]$_.scores.wardScore)
    }
  })
  $participants = @($players | ForEach-Object {
    [ordered]@{
      riot_id = [string]$_.riotId
      gamer_tag = [string]$_.riotIdGameName
      champion = [string]$_.championName
      role = if ($positionMap.ContainsKey([string]$_.position)) { $positionMap[[string]$_.position] } else { [string]$_.position }
      team = [string]$_.team
      is_bot = [bool]$_.isBot
      kills = [int]$_.scores.kills
      deaths = [int]$_.scores.deaths
      assists = [int]$_.scores.assists
      cs = [int][math]::Round([double]$_.scores.creepScore)
      vision = [math]::Round([double]$_.scores.wardScore, 2)
    }
  })
  $document = [ordered]@{
    schema_version = 2
    match_data = [ordered]@{
      game_id = $LeagueGameId
      match_date = $StartedAt.ToString('yyyy-MM-dd')
      friend_group_size = $performances.Count
      ally_side = if ($allyTeam -eq 'ORDER') { 'Blue' } else { 'Purple' }
      result = $result
      duration_minutes = [math]::Round($durationSeconds / 60, 4)
      notes = ''
    }
    performance_data = $performances
    capture_metadata = [ordered]@{
      capture_id = $captureId
      source = 'Riot Live Client Data API'
      classification = 'Classic 5v5 PvP'
      game_mode = [string]$Snapshot.gameData.gameMode
      map_number = [int]$Snapshot.gameData.mapNumber
      all_participants_human = $true
      active_player = $activeName
      game_id_source = if ($LeagueGameId) { 'League Client gameflow session' } else { 'Unavailable — enter manually before upload' }
      captured_at = (Get-Date).ToString('o')
      requires_review = $true
      warnings = @('Live Client CS and vision may differ slightly from the post-game scoreboard. Review before publishing.')
    }
    participants = $participants
  }
  $json = $document | ConvertTo-Json -Depth 8
  $matchPath = Join-Path $captureDir 'match.json'
  [System.IO.File]::WriteAllText($matchPath, $json, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $OutputRoot 'match.json'), $json, $utf8)
  Write-RecorderLog "MATCH_READY $matchPath ($result, $([math]::Round($durationSeconds)) seconds, $($performances.Count) tracked players)"
  return $matchPath
}

if ($SnapshotPath) {
  $snapshot = Get-Content -Raw -LiteralPath $SnapshotPath | ConvertFrom-Json
  Export-MatchJson $snapshot (Get-Item -LiteralPath $SnapshotPath).LastWriteTime $GameId | Out-Null
  exit 0
}

Write-RecorderLog "Recorder started. Waiting for Classic 5v5 PvP matches. Output: $OutputRoot"
do {
  $first = $null
  while (-not $first) {
    $first = Get-LiveSnapshot
    if (-not $first) { Start-Sleep -Seconds 4 }
  }

  $startedAt = Get-Date
  $last = $first
  $leagueGameId = Get-LeagueGameId
  $failures = 0
  Write-RecorderLog "Live match detected (mode=$($first.gameData.gameMode), map=$($first.gameData.mapNumber))."
  while ($failures -lt 8) {
    Start-Sleep -Seconds 2
    $snapshot = Get-LiveSnapshot
    if ($snapshot) {
      $last = $snapshot
      if (-not $leagueGameId) { $leagueGameId = Get-LeagueGameId }
      $failures = 0
      if (@($snapshot.events.Events | Where-Object EventName -eq 'GameEnd').Count) { break }
    } else { $failures++ }
  }

  try { $created = Export-MatchJson $last $startedAt $leagueGameId } catch { Write-RecorderLog "Capture failed: $($_.Exception.Message)" }
  if ($Once) { break }
  while (Get-LiveSnapshot) { Start-Sleep -Seconds 4 }
  Start-Sleep -Seconds 4
} while ($true)
