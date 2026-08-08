$ErrorActionPreference = 'Stop'
$installRoot = Join-Path $env:LOCALAPPDATA 'LeagueClassicMatchRecorder'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'League Classic Match Recorder.lnk'
$watchers = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -like "*$installRoot*watch-live-classic.ps1*"
}
foreach ($watcher in $watchers) { Stop-Process -Id $watcher.ProcessId -Force }
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
if (Test-Path -LiteralPath $installRoot) { Remove-Item -LiteralPath $installRoot -Recurse -Force }
Write-Host 'League Classic Match Recorder was uninstalled.' -ForegroundColor Green
Write-Host 'Previously captured match files were kept in Documents.'

