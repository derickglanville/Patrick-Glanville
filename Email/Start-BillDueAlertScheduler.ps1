param(
  [string]$PythonCommand = "python",
  [string]$SendTime = "09:00"
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SchedulerScript = Join-Path $ScriptFolder "bill_due_alert_scheduler.py"

if (-not (Test-Path -LiteralPath $SchedulerScript)) {
  throw "Missing bill alert scheduler script: $SchedulerScript"
}

Write-Host "Starting unpaid bill due alert scheduler..."
Write-Host "Python command: $PythonCommand"
Write-Host "Scheduler script: $SchedulerScript"
Write-Host "Daily send time: $SendTime"

& $PythonCommand $SchedulerScript --watch --send-time $SendTime
