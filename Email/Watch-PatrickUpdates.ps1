param(
  [string]$Recipient = "dglanville@gmail.com",
  [int]$IntervalSeconds = 60,
  [switch]$Once
)

$ErrorActionPreference = "Stop"

$PatrickEmail = "patrick.glanville@gmail.com"
$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ConfigPath = Join-Path $ProjectFolder "supabase-config.js"
$SettingsPath = Join-Path $ScriptFolder "smtp-settings.json"
$CredentialPath = Join-Path $ScriptFolder "smtp-credential.clixml"
$CheckpointPath = Join-Path $ScriptFolder "patrick-update-notifier-state.json"

function Get-SupabaseConfig {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing Supabase config file: $Path"
  }

  $Content = Get-Content -LiteralPath $Path -Raw
  $UrlMatch = [regex]::Match($Content, 'url:\s*"([^"]+)"')
  $KeyMatch = [regex]::Match($Content, 'anonKey:\s*"([^"]+)"')

  if (-not $UrlMatch.Success -or -not $KeyMatch.Success) {
    throw "Could not read Supabase URL and anon key from $Path"
  }

  return [pscustomobject]@{
    Url = $UrlMatch.Groups[1].Value.Trim()
    AnonKey = $KeyMatch.Groups[1].Value.Trim()
  }
}

function Get-TrackerState {
  param($Config)

  $Headers = @{
    apikey = $Config.AnonKey
    Authorization = "Bearer $($Config.AnonKey)"
  }

  $Uri = "$($Config.Url)/rest/v1/tracker_state?id=eq.patrick-glanville&select=state,updated_by,updated_at"
  $Response = Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers

  if (-not $Response -or $Response.Count -eq 0) {
    throw "No tracker_state row was returned from Supabase."
  }

  return $Response[0]
}

function Load-Checkpoint {
  if (-not (Test-Path -LiteralPath $CheckpointPath)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $CheckpointPath -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Save-Checkpoint {
  param(
    [string]$UpdatedAt,
    [string]$PatrickHistoryAt
  )

  [pscustomobject]@{
    updatedAt = $UpdatedAt
    patrickHistoryAt = $PatrickHistoryAt
    savedAt = (Get-Date).ToString("o")
  } | ConvertTo-Json | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Escape-Html {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) { return "" }
  return [System.Net.WebUtility]::HtmlEncode([string]$Value)
}

function Format-DateTimeLabel {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  return ([datetime]$Value).ToLocalTime().ToString("MMM d, yyyy, h:mm tt")
}

function Get-SmtpContext {
  if (-not (Test-Path -LiteralPath $SettingsPath) -or -not (Test-Path -LiteralPath $CredentialPath)) {
    throw "SMTP is not configured. Run Set-UrgencyReportSmtpCredential.ps1 first."
  }

  $Settings = Get-Content -LiteralPath $SettingsPath -Raw | ConvertFrom-Json
  $Credential = Import-Clixml -LiteralPath $CredentialPath
  $Password = ($Credential.GetNetworkCredential().Password -replace "\s+", "").Trim()

  return [pscustomobject]@{
    Settings = $Settings
    Credential = New-Object System.Net.NetworkCredential($Credential.UserName, $Password)
  }
}

function Send-HtmlMail {
  param(
    [string]$To,
    [string]$Subject,
    [string]$HtmlBody
  )

  $SmtpContext = Get-SmtpContext
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

  $MailMessage = New-Object System.Net.Mail.MailMessage
  try {
    $FromAddress = if ([string]::IsNullOrWhiteSpace($SmtpContext.Settings.displayName)) {
      New-Object System.Net.Mail.MailAddress($SmtpContext.Settings.from)
    } else {
      New-Object System.Net.Mail.MailAddress($SmtpContext.Settings.from, $SmtpContext.Settings.displayName)
    }

    $MailMessage.From = $FromAddress
    [void]$MailMessage.To.Add($To)
    $MailMessage.Subject = $Subject
    $MailMessage.SubjectEncoding = [System.Text.Encoding]::UTF8
    $MailMessage.BodyEncoding = [System.Text.Encoding]::UTF8
    $MailMessage.IsBodyHtml = $true
    $MailMessage.Body = $HtmlBody

    $Attempts = @(
      [pscustomobject]@{
        Port = [int]$SmtpContext.Settings.port
        EnableSsl = [bool]$SmtpContext.Settings.useSsl
        Label = "configured SMTP settings"
      }
    )

    if ($SmtpContext.Settings.smtpHost -eq "smtp.gmail.com" -and [int]$SmtpContext.Settings.port -ne 465) {
      $Attempts += [pscustomobject]@{
        Port = 465
        EnableSsl = $true
        Label = "Gmail SSL fallback"
      }
    }

    $Errors = @()
    foreach ($Attempt in $Attempts) {
      $SmtpClient = New-Object System.Net.Mail.SmtpClient($SmtpContext.Settings.smtpHost, $Attempt.Port)
      try {
        $SmtpClient.EnableSsl = $Attempt.EnableSsl
        $SmtpClient.UseDefaultCredentials = $false
        $SmtpClient.DeliveryMethod = [System.Net.Mail.SmtpDeliveryMethod]::Network
        $SmtpClient.Credentials = $SmtpContext.Credential
        $SmtpClient.Send($MailMessage)
        return
      } catch {
        $Inner = if ($_.Exception.InnerException) { " Inner: $($_.Exception.InnerException.Message)" } else { "" }
        $Errors += "$($Attempt.Label) on port $($Attempt.Port): $($_.Exception.Message)$Inner"
      } finally {
        $SmtpClient.Dispose()
      }
    }

    throw ("SMTP send failed. " + ($Errors -join " | "))
  } finally {
    $MailMessage.Dispose()
  }
}

function Get-NewPatrickEntries {
  param(
    $TrackerState,
    [string]$AfterCreatedAt
  )

  $Entries = @($TrackerState.state.history) | Where-Object {
    $_.userEmail -eq $PatrickEmail -and
    (-not $AfterCreatedAt -or [string]$_.createdAt -gt $AfterCreatedAt)
  } | Sort-Object createdAt

  return $Entries
}

function Build-PatrickUpdateEmailHtml {
  param(
    [array]$Entries,
    [string]$UpdatedAt
  )

  $Items = foreach ($Entry in $Entries) {
@"
<li style="margin:0 0 12px;">
  <strong>$(Escape-Html $Entry.taskTitle)</strong><br>
  <span>$(Escape-Html (Format-DateTimeLabel $Entry.createdAt))</span><br>
  <span>$(Escape-Html $Entry.summary)</span><br>
  <span>Status: $(Escape-Html $Entry.status) | Complete: $(Escape-Html $Entry.percent)%</span>
</li>
"@
  }

@"
<!doctype html>
<html lang="en">
<body style="margin:0;background:#f4f6f9;color:#18202a;font-family:Arial,Helvetica,sans-serif;">
  <main style="max-width:760px;margin:0 auto;background:#ffffff;padding:24px 28px;">
    <h1 style="margin:0 0 10px;font-size:28px;">Patrick Tracker Activity Notification</h1>
    <p style="margin:0 0 14px;">Patrick made changes in the support tracker.</p>
    <p style="margin:0 0 18px;"><strong>Shared save time:</strong> $(Escape-Html (Format-DateTimeLabel $UpdatedAt))</p>
    <h2 style="margin:0 0 12px;font-size:20px;">Changes made</h2>
    <ol style="padding-left:20px;">$($Items -join "`n")</ol>
  </main>
</body>
</html>
"@
}

function Get-LatestPatrickHistoryAt {
  param([array]$Entries)

  if (-not $Entries.Count) { return "" }
  return ($Entries | Select-Object -Last 1).createdAt
}

function Invoke-PatrickUpdateCheck {
  $Config = Get-SupabaseConfig -Path $ConfigPath
  $TrackerState = Get-TrackerState -Config $Config
  $Checkpoint = Load-Checkpoint

  $AllPatrickEntries = @($TrackerState.state.history) | Where-Object { $_.userEmail -eq $PatrickEmail } | Sort-Object createdAt
  $LatestPatrickHistoryAt = Get-LatestPatrickHistoryAt -Entries $AllPatrickEntries

  if (-not $Checkpoint) {
    Save-Checkpoint -UpdatedAt $TrackerState.updated_at -PatrickHistoryAt $LatestPatrickHistoryAt
    Write-Host "Bootstrapped Patrick update notifier checkpoint."
    return
  }

  $NewEntries = Get-NewPatrickEntries -TrackerState $TrackerState -AfterCreatedAt $Checkpoint.patrickHistoryAt
  if (-not $NewEntries.Count) {
    if ($TrackerState.updated_at -ne $Checkpoint.updatedAt -or $LatestPatrickHistoryAt -ne $Checkpoint.patrickHistoryAt) {
      Save-Checkpoint -UpdatedAt $TrackerState.updated_at -PatrickHistoryAt $LatestPatrickHistoryAt
    }
    Write-Host "No new Patrick updates detected."
    return
  }

  $Subject = "Patrick tracker activity - $($NewEntries.Count) change$((if ($NewEntries.Count -eq 1) { '' } else { 's' }))"
  $Body = Build-PatrickUpdateEmailHtml -Entries $NewEntries -UpdatedAt $TrackerState.updated_at
  Send-HtmlMail -To $Recipient -Subject $Subject -HtmlBody $Body

  Save-Checkpoint -UpdatedAt $TrackerState.updated_at -PatrickHistoryAt $LatestPatrickHistoryAt
  Write-Host "Sent Patrick update notification to: $Recipient"
}

if ($Once) {
  Invoke-PatrickUpdateCheck
  exit 0
}

Write-Host "Watching Supabase tracker for Patrick updates..."
Write-Host "Recipient: $Recipient"
Write-Host "Polling interval: $IntervalSeconds seconds"
Write-Host "Press Ctrl+C to stop."

while ($true) {
  try {
    Invoke-PatrickUpdateCheck
  } catch {
    Write-Warning $_.Exception.Message
  }

  Start-Sleep -Seconds $IntervalSeconds
}
