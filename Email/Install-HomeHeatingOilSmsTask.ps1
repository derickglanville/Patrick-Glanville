$ErrorActionPreference = "Stop"
$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $scriptFolder "run-home-heating-oil-sms.cmd"
$taskName = "Home Heating Oil Low Level SMS"
if (-not (Test-Path -LiteralPath $runner)) { throw "Missing oil reminder runner: $runner" }
$action = New-ScheduledTaskAction -Execute $runner
$trigger = New-ScheduledTaskTrigger -Daily -At 9:15AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Installed $taskName for daily 9:15 AM checks."
