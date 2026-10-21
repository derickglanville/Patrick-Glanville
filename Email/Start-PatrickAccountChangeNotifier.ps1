param(
  [string]$PythonCommand = "python"
)

$ErrorActionPreference = "Stop"
$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$NotifierScript = Join-Path $ScriptFolder "watch_patrick_account_changes.py"

if (-not (Test-Path -LiteralPath $NotifierScript)) {
  throw "Missing notifier script: $NotifierScript"
}

Write-Host "Starting Patrick Firestore account change notifier for Derick."
& $PythonCommand $NotifierScript
