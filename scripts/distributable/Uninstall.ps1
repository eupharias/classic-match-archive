param([int]$TrayProcessId = 0)

$ErrorActionPreference = 'Stop'
$installRoot = Join-Path $env:LOCALAPPDATA 'LeagueClassicMatchRecorder'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'League Classic Match Recorder.lnk'
$recorders = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessId -ne $PID -and ($_.CommandLine -like "*$installRoot*watch-live-classic.ps1*" -or $_.CommandLine -like "*$installRoot*tray-host.ps1*")
}
foreach ($recorder in $recorders) { Stop-Process -Id $recorder.ProcessId -Force -ErrorAction SilentlyContinue }
if ($TrayProcessId -gt 0) {
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Process -Id $TrayProcessId -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
}
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
if (Test-Path -LiteralPath $installRoot) { Remove-Item -LiteralPath $installRoot -Recurse -Force }
Write-Host 'League Classic Match Recorder was uninstalled.' -ForegroundColor Green
Write-Host 'Previously captured match files were kept in Documents.'
