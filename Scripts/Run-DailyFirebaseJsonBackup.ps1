$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "backup_firebase_state.py"
$pythonPath = "C:\Program Files\Python38\python.exe"

if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Missing Firebase backup script: $scriptPath"
}
if (-not (Test-Path -LiteralPath $pythonPath)) {
  throw "Missing Python interpreter: $pythonPath"
}

& $pythonPath $scriptPath
exit $LASTEXITCODE
