param(
  [string]$GamerTag,
  [string]$ArchiveName,
  [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$installRoot = Join-Path $env:LOCALAPPDATA 'LeagueClassicMatchRecorder'
$sourceWatcher = Join-Path $PSScriptRoot 'watch-live-classic.ps1'
if (-not (Test-Path -LiteralPath $sourceWatcher)) { throw 'The recorder package is incomplete.' }

if (-not $GamerTag) { $GamerTag = Read-Host 'Enter your League Gamer Tag (the name shown in game)' }
if (-not $ArchiveName) { $ArchiveName = Read-Host 'Enter your player name in the Match Archive' }
$GamerTag = $GamerTag.Trim()
$ArchiveName = $ArchiveName.Trim()
if (-not $GamerTag -or -not $ArchiveName) { throw 'Both Gamer Tag and Archive player name are required.' }

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Copy-Item -LiteralPath $sourceWatcher -Destination (Join-Path $installRoot 'watch-live-classic.ps1') -Force
$config = [ordered]@{
  primaryRiotIdGameName = $GamerTag
  players = [ordered]@{ $GamerTag = $ArchiveName }
}
$config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $installRoot 'live-capture.config.json') -Encoding UTF8

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'League Classic Match Recorder.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Get-Command powershell.exe).Source
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $installRoot 'watch-live-classic.ps1')`""
$shortcut.WorkingDirectory = $installRoot
$shortcut.Description = 'Creates uploadable match.json files from League Classic PvP matches.'
$shortcut.Save()

if (-not $NoStart) {
  Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',(Join-Path $installRoot 'watch-live-classic.ps1')) -WindowStyle Hidden
}

Write-Host ''
Write-Host 'League Classic Match Recorder is installed.' -ForegroundColor Green
Write-Host "Configured: $GamerTag -> $ArchiveName"
Write-Host "Match files: $(Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'League Classic Match Captures')"
Write-Host 'The recorder will start automatically when you sign in to Windows.'

