$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SchedulerScript = Join-Path $ScriptFolder "bill_due_alert_scheduler.py"
$Python311 = "C:\edb\languagepack\v4\Python-3.11\python.exe"

if (-not (Test-Path -LiteralPath $SchedulerScript)) {
  throw "Missing bill due alert scheduler script: $SchedulerScript"
}

if (-not (Test-Path -LiteralPath $Python311)) {
  throw "Missing Python interpreter: $Python311"
}

& $Python311 $SchedulerScript --run-if-due --send-time 09:00
