param([switch]$StartNow)

$watcher = Join-Path $PSScriptRoot 'watch-live-classic.ps1'
if (-not (Test-Path -LiteralPath $watcher)) { throw "Watcher not found: $watcher" }
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'League Classic Match Recorder.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Get-Command powershell.exe).Source
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watcher`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'Watches for League Classic PvP matches and creates match.json files.'
$shortcut.Save()
Write-Output "Startup recorder installed: $shortcutPath"

if ($StartNow) {
  Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$watcher) -WindowStyle Hidden
  Write-Output 'Recorder started in the background.'
}
