$ErrorActionPreference = "Stop"

$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $scriptFolder "run-admin-notes-reminders-sms.cmd"
$taskName = "Admin Notes and Reminders SMS"

if (-not (Test-Path -LiteralPath $runner)) {
  throw "Missing reminder runner: $runner"
}

$action = New-ScheduledTaskAction -Execute $runner
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Description "Admin Notes & Reminders: Gmail before due dates and Verizon text on due dates until shutdown." -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Installed $taskName for 9:00 AM local time: Gmail before due dates, Verizon text until shutdown."
