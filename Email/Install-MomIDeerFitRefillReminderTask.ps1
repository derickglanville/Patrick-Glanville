$ErrorActionPreference = "Stop"

$taskName = "3G Mom IDeerFit Refill Reminder"
$taskPath = "\3G Tracking and Notifications\"
$runner = Join-Path $PSScriptRoot "Run-MomIDeerFitRefillReminder.ps1"
$powerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$userId = "{0}\{1}" -f $env:USERDOMAIN, $env:USERNAME

$action = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Daily -At 9:30AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Installed daily SMS task: $taskPath$taskName (runs at 9:30 AM local time)."
