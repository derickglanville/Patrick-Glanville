param(
  [string]$PythonCommand = "python"
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SchedulerScript = Join-Path $ScriptFolder "scheduled_urgency_report_sender.py"

if (-not (Test-Path -LiteralPath $SchedulerScript)) {
  throw "Missing scheduler script: $SchedulerScript"
}

Write-Host "Starting Patrick urgency email scheduler..."
Write-Host "Python command: $PythonCommand"
Write-Host "Scheduler script: $SchedulerScript"

& $PythonCommand $SchedulerScript
