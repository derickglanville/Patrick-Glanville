$ErrorActionPreference = "Stop"

$ScriptFolder = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $PSCommandPath }
$ProjectFolder = Split-Path -Parent $ScriptFolder
$WatcherScript = Join-Path $ScriptFolder "Watch-PatrickChangeReport.ps1"
$WatcherLog = Join-Path $ScriptFolder "watch-patrick-change-report.log"

if (-not (Test-Path -LiteralPath $WatcherScript)) {
  throw "Missing Patrick change watcher script: $WatcherScript"
}

$ExistingWatcher = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -eq "powershell.exe" -and
    $_.CommandLine -like "*Watch-PatrickChangeReport.ps1*"
  } |
  Select-Object -First 1

if ($ExistingWatcher) {
  Write-Host "Patrick change watcher already running. PID: $($ExistingWatcher.ProcessId)"
  exit 0
}

$Command = "& '$WatcherScript' *>> '$WatcherLog'"
Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
  -WorkingDirectory $ProjectFolder `
  -WindowStyle Hidden

Write-Host "Started Patrick change watcher."
