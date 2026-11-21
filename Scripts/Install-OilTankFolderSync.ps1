param([switch]$StartNow)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'oil_tank_folder_sync.py'
$pythonw = (Get-Command pythonw.exe -ErrorAction Stop).Source
$taskName = 'Home Heating Oil Tank Photo Sync'
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskAction = New-ScheduledTaskAction -Execute $pythonw -Argument ('"{0}" --watch' -f $scriptPath) -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
$taskTrigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$taskSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Description 'Read new photos from Home Heating Oil\Tank Level and save confident readings to Admin Firebase.' -Force | Out-Null
if ($StartNow) { Start-ScheduledTask -TaskName $taskName }
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
