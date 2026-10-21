$ErrorActionPreference = "Stop"

$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$reminderScript = Join-Path $scriptFolder "mom_ideerfit_refill_reminder.py"
$pythonCandidates = @(
    "C:\edb\languagepack\v4\Python-3.11\python.exe",
    "C:\Users\deric\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
)
$python = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $python) {
    throw "Python was not found. Install Python or update Run-MomIDeerFitRefillReminder.ps1."
}

& $python $reminderScript @args
exit $LASTEXITCODE
