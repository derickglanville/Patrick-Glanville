$ErrorActionPreference = "Stop"
$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $scriptFolder "run-food-tracking-georgette-diet-reminder.cmd"
$taskName = "Food Tracking Saturday Georgette Diet Reminder"
if (-not (Test-Path -LiteralPath $runner)) { throw "Missing reminder runner: $runner" }
$action = New-ScheduledTaskAction -Execute $runner
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Installed $taskName for every Saturday at 9:00 AM local time."
