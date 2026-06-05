param(
  [string]$SmtpHost = "smtp.gmail.com",
  [int]$Port = 587,
  [string]$Username = "dglanville@gmail.com",
  [string]$From = "dglanville@gmail.com",
  [string]$DisplayName = "Patrick Glanville Support Tracker"
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SettingsPath = Join-Path $ScriptFolder "smtp-settings.json"
$CredentialPath = Join-Path $ScriptFolder "smtp-credential.clixml"

Write-Host "This will store the SMTP password securely for the current Windows user on this machine."
Write-Host "For Gmail, use an App Password, not your normal account password."

$Credential = Get-Credential -UserName $Username -Message "Enter the SMTP username and password/app password"

$Settings = [pscustomobject]@{
  smtpHost = $SmtpHost
  port = $Port
  useSsl = $true
  username = $Credential.UserName
  from = $From
  displayName = $DisplayName
}

$Settings | ConvertTo-Json | Set-Content -LiteralPath $SettingsPath -Encoding UTF8
$Credential | Export-Clixml -LiteralPath $CredentialPath

Write-Host "Saved SMTP settings to: $SettingsPath"
Write-Host "Saved encrypted SMTP credential to: $CredentialPath"
Write-Host "You can now run Invoke-DailyUrgencyReport.ps1 for fully automatic email sending on this machine."
