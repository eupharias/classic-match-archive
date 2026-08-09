param([switch]$StartPaused)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$installRoot = $PSScriptRoot
$watcherPath = Join-Path $installRoot 'watch-live-classic.ps1'
$configPath = Join-Path $installRoot 'live-capture.config.json'
$uninstallPath = Join-Path $installRoot 'Uninstall.ps1'
$captureRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'League Classic Match Captures'
$createdNew = $false
$mutex = [Threading.Mutex]::new($true,'Local\WreqClassicMatchRecorderTray',[ref]$createdNew)
if (-not $createdNew) { exit 0 }

$script:paused = [bool]$StartPaused
$script:recorderProcess = $null
$script:closing = $false

function Stop-Recorder {
  if ($script:recorderProcess -and -not $script:recorderProcess.HasExited) {
    Stop-Process -Id $script:recorderProcess.Id -Force -ErrorAction SilentlyContinue
    $script:recorderProcess.WaitForExit(3000) | Out-Null
  }
  $script:recorderProcess = $null
}

function Start-Recorder {
  if ($script:paused -or $script:closing) { return }
  if ($script:recorderProcess -and -not $script:recorderProcess.HasExited) { return }
  if (-not (Test-Path -LiteralPath $watcherPath) -or -not (Test-Path -LiteralPath $configPath)) { return }
  $script:recorderProcess = Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$watcherPath,'-ConfigPath',$configPath) -WindowStyle Hidden -PassThru
}

$contextMenu = [System.Windows.Forms.ContextMenuStrip]::new()
$statusItem = [System.Windows.Forms.ToolStripMenuItem]::new('Status: Starting')
$statusItem.Enabled = $false
$pauseItem = [System.Windows.Forms.ToolStripMenuItem]::new('Pause recording')
$openCapturesItem = [System.Windows.Forms.ToolStripMenuItem]::new('Open captured matches')
$openLogItem = [System.Windows.Forms.ToolStripMenuItem]::new('Open recorder log')
$uninstallItem = [System.Windows.Forms.ToolStripMenuItem]::new('Uninstall recorder...')
$exitItem = [System.Windows.Forms.ToolStripMenuItem]::new('Exit tray app')
$contextMenu.Items.AddRange(@($statusItem,$pauseItem,(New-Object System.Windows.Forms.ToolStripSeparator),$openCapturesItem,$openLogItem,(New-Object System.Windows.Forms.ToolStripSeparator),$uninstallItem,$exitItem))

$notifyIcon = [System.Windows.Forms.NotifyIcon]::new()
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.ContextMenuStrip = $contextMenu
$notifyIcon.Visible = $true

function Update-TrayStatus {
  $running = $script:recorderProcess -and -not $script:recorderProcess.HasExited
  if ($script:paused) {
    $statusItem.Text = 'Status: Recording paused'
    $pauseItem.Text = 'Resume recording'
    $notifyIcon.Text = 'WREQ Classic Recorder - Paused'
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Warning
  } elseif ($running) {
    $statusItem.Text = 'Status: Recording enabled'
    $pauseItem.Text = 'Pause recording'
    $notifyIcon.Text = 'WREQ Classic Recorder - Running'
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
  } else {
    $statusItem.Text = 'Status: Restarting recorder'
    $pauseItem.Text = 'Pause recording'
    $notifyIcon.Text = 'WREQ Classic Recorder - Starting'
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Information
  }
}

$pauseItem.Add_Click({
  if ($script:paused) {
    $script:paused = $false
    Start-Recorder
    $notifyIcon.ShowBalloonTip(2500,'WREQ Classic Recorder','Recording resumed. Waiting for a Classic 5v5 match.',[System.Windows.Forms.ToolTipIcon]::Info)
  } else {
    $script:paused = $true
    Stop-Recorder
    $notifyIcon.ShowBalloonTip(2500,'WREQ Classic Recorder','Recording is paused. Matches will not be captured until recording is resumed.',[System.Windows.Forms.ToolTipIcon]::Warning)
  }
  Update-TrayStatus
})

$openCapturesItem.Add_Click({
  New-Item -ItemType Directory -Force -Path $captureRoot | Out-Null
  Start-Process explorer.exe -ArgumentList $captureRoot
})

$openLogItem.Add_Click({
  $logPath = Join-Path $captureRoot 'recorder.log'
  if (Test-Path -LiteralPath $logPath) { Start-Process notepad.exe -ArgumentList $logPath }
  else { [System.Windows.Forms.MessageBox]::Show('No recorder log has been created yet.','WREQ Classic Recorder','OK','Information') | Out-Null }
})

$notifyIcon.Add_DoubleClick({
  New-Item -ItemType Directory -Force -Path $captureRoot | Out-Null
  Start-Process explorer.exe -ArgumentList $captureRoot
})

$uninstallItem.Add_Click({
  $answer = [System.Windows.Forms.MessageBox]::Show('Uninstall WREQ Classic Match Recorder? Previously captured match files will be kept in Documents.','Uninstall recorder','YesNo','Warning')
  if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { return }
  $script:closing = $true
  Stop-Recorder
  Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$uninstallPath,'-TrayProcessId',$PID) -WindowStyle Hidden
  $notifyIcon.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})

$exitItem.Add_Click({
  $answer = [System.Windows.Forms.MessageBox]::Show('Exit the tray app and stop recording until the next Windows sign-in?','Exit recorder','YesNo','Question')
  if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { return }
  $script:closing = $true
  Stop-Recorder
  $notifyIcon.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})

$timer = [System.Windows.Forms.Timer]::new()
$timer.Interval = 5000
$timer.Add_Tick({
  if (-not $script:paused -and (-not $script:recorderProcess -or $script:recorderProcess.HasExited)) { Start-Recorder }
  Update-TrayStatus
})

Start-Recorder
Update-TrayStatus
$timer.Start()
$notifyIcon.ShowBalloonTip(3500,'WREQ Classic Recorder','Recorder is running in the Windows tray. Right-click the icon for controls.',[System.Windows.Forms.ToolTipIcon]::Info)
try { [System.Windows.Forms.Application]::Run() }
finally {
  $script:closing = $true
  $timer.Stop()
  Stop-Recorder
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
  $contextMenu.Dispose()
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
