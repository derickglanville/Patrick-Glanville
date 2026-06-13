$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$WatcherScript = Join-Path $ScriptFolder "Watch-MedicationRefillAlerts.ps1"

if (-not (Test-Path -LiteralPath $WatcherScript)) {
  throw "Missing medication refill watcher script: $WatcherScript"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $WatcherScript -Once
