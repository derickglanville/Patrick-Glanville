param(
  [string]$PythonCommand = "python"
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SchedulerScript = Join-Path $ScriptFolder "weekly_report_scheduler.py"

if (-not (Test-Path -LiteralPath $SchedulerScript)) {
  throw "Missing scheduler script: $SchedulerScript"
}

Write-Host "Starting Patrick weekly report scheduler..."
Write-Host "Python command: $PythonCommand"
Write-Host "Scheduler script: $SchedulerScript"

& $PythonCommand $SchedulerScript
