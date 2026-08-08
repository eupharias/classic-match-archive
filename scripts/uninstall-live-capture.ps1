$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'League Classic Match Recorder.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
  Remove-Item -LiteralPath $shortcutPath
  Write-Output 'League Classic Match Recorder removed from Windows startup.'
} else {
  Write-Output 'League Classic Match Recorder was not installed in Windows startup.'
}
