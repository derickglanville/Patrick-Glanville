param(
  [string]$ReportPath,
  [switch]$Send
)

$ErrorActionPreference = "Stop"

$Recipients = @(
  "dglanville@gmail.com",
  "patrick.glanville@gmail.com",
  "courtney.glanville@gmail.com",
  "hemmgeor@gmail.com"
)

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SettingsPath = Join-Path $ScriptFolder "smtp-settings.json"
$CredentialPath = Join-Path $ScriptFolder "smtp-credential.clixml"

function Send-ViaSmtp {
  param(
    [string]$ReportPath,
    [string]$HtmlBody,
    [string]$Subject,
    [string[]]$Recipients,
    [bool]$SendNow
  )

  if (-not (Test-Path -LiteralPath $SettingsPath) -or -not (Test-Path -LiteralPath $CredentialPath)) {
    return $false
  }

  $Settings = Get-Content -LiteralPath $SettingsPath -Raw | ConvertFrom-Json
  $Credential = Import-Clixml -LiteralPath $CredentialPath
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

  $MailMessage = New-Object System.Net.Mail.MailMessage
  try {
    $FromAddress = if ([string]::IsNullOrWhiteSpace($Settings.displayName)) {
      New-Object System.Net.Mail.MailAddress($Settings.from)
    } else {
      New-Object System.Net.Mail.MailAddress($Settings.from, $Settings.displayName)
    }

    $MailMessage.From = $FromAddress
    foreach ($Recipient in $Recipients) {
      [void]$MailMessage.To.Add($Recipient)
    }

    $MailMessage.Subject = $Subject
    $MailMessage.SubjectEncoding = [System.Text.Encoding]::UTF8
    $MailMessage.BodyEncoding = [System.Text.Encoding]::UTF8
    $MailMessage.IsBodyHtml = $true
    $MailMessage.Body = $HtmlBody
    [void]$MailMessage.Attachments.Add($ReportPath)

    $RawPassword = $Credential.GetNetworkCredential().Password
    $NormalizedPassword = ($RawPassword -replace "\s+", "").Trim()

    $CredentialNetwork = New-Object System.Net.NetworkCredential(
      $Credential.UserName,
      $NormalizedPassword
    )

    $Attempts = @(
      [pscustomobject]@{
        Port = [int]$Settings.port
        EnableSsl = [bool]$Settings.useSsl
        Label = "configured SMTP settings"
      }
    )

    if ($Settings.smtpHost -eq "smtp.gmail.com" -and [int]$Settings.port -ne 465) {
      $Attempts += [pscustomobject]@{
        Port = 465
        EnableSsl = $true
        Label = "Gmail SSL fallback"
      }
    }

    if (-not $SendNow) {
      Write-Warning "SMTP is configured, but draft mode is not supported for SMTP. Sending immediately instead."
    }

    $Errors = @()
    foreach ($Attempt in $Attempts) {
      $SmtpClient = New-Object System.Net.Mail.SmtpClient($Settings.smtpHost, $Attempt.Port)
      try {
        $SmtpClient.EnableSsl = $Attempt.EnableSsl
        $SmtpClient.UseDefaultCredentials = $false
        $SmtpClient.DeliveryMethod = [System.Net.Mail.SmtpDeliveryMethod]::Network
        $SmtpClient.Credentials = $CredentialNetwork
        $SmtpClient.Send($MailMessage)
        Write-Host "Sent rich urgency report by SMTP to: $($Recipients -join ', ')"
        return $true
      } catch {
        $Inner = if ($_.Exception.InnerException) { " Inner: $($_.Exception.InnerException.Message)" } else { "" }
        $Errors += "$($Attempt.Label) on port $($Attempt.Port): $($_.Exception.Message)$Inner"
      } finally {
        $SmtpClient.Dispose()
      }
    }

    throw ("SMTP send failed. " + ($Errors -join " | "))
  } finally {
    if ($MailMessage.Attachments) {
      foreach ($Attachment in @($MailMessage.Attachments)) {
        $Attachment.Dispose()
      }
    }
    $MailMessage.Dispose()
  }
}

if (-not $ReportPath) {
  $ReportPath = Get-ChildItem -LiteralPath $ScriptFolder -Filter "patrick-urgency-report-*.html" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

if (-not $ReportPath -or -not (Test-Path -LiteralPath $ReportPath)) {
  throw "No rich HTML report found. Save a report from the dashboard into $ScriptFolder first."
}

$HtmlBody = Get-Content -LiteralPath $ReportPath -Raw
$ReportDate = (Get-Date).ToString("yyyy-MM-dd")
$Subject = "Patrick Glanville Urgency Report - $ReportDate"

try {
  $Outlook = New-Object -ComObject Outlook.Application
  $Mail = $Outlook.CreateItem(0)
  $Mail.To = ($Recipients -join ";")
  $Mail.Subject = $Subject
  $Mail.HTMLBody = $HtmlBody
  $Mail.Attachments.Add($ReportPath) | Out-Null

  if ($Send) {
    $Mail.Send()
    Write-Host "Sent rich urgency report to: $($Recipients -join ', ')"
  } else {
    $Mail.Display()
    Write-Host "Opened Outlook draft for: $($Recipients -join ', ')"
  }
} catch {
  if (Send-ViaSmtp -ReportPath $ReportPath -HtmlBody $HtmlBody -Subject $Subject -Recipients $Recipients -SendNow $Send) {
    return
  }

  $EscapedSubject = [uri]::EscapeDataString($Subject)
  $To = [uri]::EscapeDataString(($Recipients -join ","))
  $Body = [uri]::EscapeDataString("Please see the rich HTML urgency report. Attach the report file or open it and copy the formatted report into this email.`n`nReport file: $ReportPath")
  $GmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=$To&su=$EscapedSubject&body=$Body"

  Start-Process $GmailUrl
  Start-Process -FilePath $ReportPath

  Write-Warning "Outlook desktop is not available or not registered on this machine, and SMTP is not configured."
  Write-Host "Opened Gmail compose and the HTML report file."
  Write-Host "To enable fully automatic sending, run Set-UrgencyReportSmtpCredential.ps1 in this folder."
}
