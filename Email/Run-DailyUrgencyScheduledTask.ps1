$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ReportPath = Join-Path $ScriptFolder ("patrick-urgency-report-{0}.html" -f (Get-Date).ToString("yyyy-MM-dd"))
$InvokeScript = Join-Path $ScriptFolder "Invoke-DailyUrgencyReport.ps1"
$SharedSender = Join-Path $ProjectFolder "Scripts\send_daily_email.py"
$Python311 = "C:\edb\languagepack\v4\Python-3.11\python.exe"

if (-not (Test-Path -LiteralPath $InvokeScript)) {
  throw "Missing urgency generator script: $InvokeScript"
}

if (-not (Test-Path -LiteralPath $SharedSender)) {
  throw "Missing shared sender script: $SharedSender"
}

if (-not (Test-Path -LiteralPath $Python311)) {
  throw "Missing Python interpreter: $Python311"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $InvokeScript -GenerateOnly

if (-not (Test-Path -LiteralPath $ReportPath)) {
  throw "Urgency report was not generated: $ReportPath"
}

& $Python311 $SharedSender --send-now --report-kind urgency --file $ReportPath
