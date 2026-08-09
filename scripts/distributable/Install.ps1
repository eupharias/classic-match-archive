param([switch]$NoStart)

$ErrorActionPreference = 'Stop'
$installRoot = Join-Path $env:LOCALAPPDATA 'LeagueClassicMatchRecorder'
$sourceWatcher = Join-Path $PSScriptRoot 'watch-live-classic.ps1'
$sourceTray = Join-Path $PSScriptRoot 'tray-host.ps1'
$sourceUninstaller = Join-Path $PSScriptRoot 'Uninstall.ps1'
if (-not (Test-Path -LiteralPath $sourceWatcher) -or -not (Test-Path -LiteralPath $sourceTray) -or -not (Test-Path -LiteralPath $sourceUninstaller)) { throw 'The recorder package is incomplete.' }

$existingProcesses = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessId -ne $PID -and ($_.CommandLine -like "*$installRoot*watch-live-classic.ps1*" -or $_.CommandLine -like "*$installRoot*tray-host.ps1*")
}
foreach ($process in $existingProcesses) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Copy-Item -LiteralPath $sourceWatcher -Destination (Join-Path $installRoot 'watch-live-classic.ps1') -Force
Copy-Item -LiteralPath $sourceTray -Destination (Join-Path $installRoot 'tray-host.ps1') -Force
Copy-Item -LiteralPath $sourceUninstaller -Destination (Join-Path $installRoot 'Uninstall.ps1') -Force
$config = [ordered]@{
  players = [ordered]@{
    sweetberryW = 'Austin'
    Retrax = 'Blake D.'
    Kelando = 'Blake G.'
    Bishop = 'Dane'
    Rook = 'Jake'
    Tokoyami = 'Kaleb'
    Amicias = 'Rachel'
    Knada = 'Steven'
    Valabrax = 'Zach'
  }
}
$config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $installRoot 'live-capture.config.json') -Encoding UTF8

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'League Classic Match Recorder.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Get-Command powershell.exe).Source
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $installRoot 'tray-host.ps1')`""
$shortcut.WorkingDirectory = $installRoot
$shortcut.Description = 'Runs the WREQ Classic Match Recorder in the Windows tray.'
$shortcut.Save()

if (-not $NoStart) {
  Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',(Join-Path $installRoot 'tray-host.ps1')) -WindowStyle Hidden
}

Write-Host ''
Write-Host 'League Classic Match Recorder is installed.' -ForegroundColor Green
Write-Host 'Configured to recognize all nine Match Archive players.'
Write-Host "Match files: $(Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'League Classic Match Captures')"
Write-Host 'The recorder will start automatically when you sign in to Windows.'
Write-Host 'Look for its icon in the Windows notification area. Right-click it for controls.'
