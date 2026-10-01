$ErrorActionPreference = "Stop"

$taskName = "3G Daily Firebase JSON Backup"
$taskPath = "\3G Tracking and Notifications\"
$runner = Join-Path $PSScriptRoot "Run-DailyFirebaseJsonBackup.ps1"
$powerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$userId = "{0}\{1}" -f $env:USERDOMAIN, $env:USERNAME

if (-not (Test-Path -LiteralPath $runner)) {
  throw "Missing Firebase backup runner: $runner"
}

$action = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00PM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Installed daily Firebase JSON backup task: $taskPath$taskName (runs at 9:00 PM local time)."
