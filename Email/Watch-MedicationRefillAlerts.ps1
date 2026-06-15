param(
  [int]$IntervalSeconds = 3600,
  [switch]$Once
)

$ErrorActionPreference = "Stop"

$ScriptFolder = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $PSCommandPath }
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ConfigPath = Join-Path $ProjectFolder "supabase-config.js"
$SettingsPath = Join-Path $ScriptFolder "smtp-settings.json"
$CredentialPath = Join-Path $ScriptFolder "smtp-credential.clixml"
$CheckpointPath = Join-Path $ScriptFolder "medication-refill-alert-state.json"
$PythonSenderScript = Join-Path $ProjectFolder "Scripts\send_daily_email.py"
$AlertWindowDays = 7
$Recipients = @(
  "dglanville@gmail.com",
  "patrick.glanville@gmail.com",
  "courtney.glanville@gmail.com",
  "hemmgeor@gmail.com",
  "rowena.montgomery@gmail.com"
)

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

  $Uri = "$($Config.Url)/rest/v1/tracker_state?id=eq.patrick-glanville&select=state,updated_at"
  $Response = Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers

  if (-not $Response -or $Response.Count -eq 0) {
    throw "No tracker_state row was returned from Supabase."
  }

  return $Response[0]
}

function Load-Checkpoint {
  if (-not (Test-Path -LiteralPath $CheckpointPath)) {
    return [pscustomobject]@{
      alerts = @{}
      savedAt = ""
    }
  }

  try {
    $Loaded = Get-Content -LiteralPath $CheckpointPath -Raw | ConvertFrom-Json
    if (-not $Loaded.alerts) {
      $Loaded | Add-Member -NotePropertyName alerts -NotePropertyValue @{}
    }
    return $Loaded
  } catch {
    return [pscustomobject]@{
      alerts = @{}
      savedAt = ""
    }
  }
}

function Save-Checkpoint {
  param($Checkpoint)

  $Checkpoint.savedAt = (Get-Date).ToString("o")
  $Checkpoint | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
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
    [string[]]$To,
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
    foreach ($Recipient in $To) {
      if (-not [string]::IsNullOrWhiteSpace($Recipient)) {
        [void]$MailMessage.To.Add($Recipient)
      }
    }
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

    if ($SmtpContext.Settings.smtpHost -eq "smtp.gmail.com" -and [int]$SmtpContext.Settings.port -eq 587 -and -not [bool]$SmtpContext.Settings.useSsl) {
      $Attempts = @(
        [pscustomobject]@{
          Port = 587
          EnableSsl = $true
          Label = "Gmail STARTTLS on port 587"
        }
      ) + $Attempts
    }

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

function Get-AvailablePythonCommand {
  $Candidates = @(
    "C:\edb\languagepack\v4\Python-3.11\python.exe",
    "C:\Users\deric\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
    "python"
  )

  foreach ($Candidate in $Candidates) {
    if ($Candidate -eq "python") {
      return $Candidate
    }
    if (Test-Path -LiteralPath $Candidate) {
      return $Candidate
    }
  }

  return "python"
}

function Send-HtmlMailWithPythonFallback {
  param(
    [string[]]$To,
    [string]$Subject,
    [string]$HtmlBody
  )

  try {
    Send-HtmlMail -To $To -Subject $Subject -HtmlBody $HtmlBody
    return
  } catch {
    if (-not (Test-Path -LiteralPath $PythonSenderScript)) {
      throw
    }

    $OutputPath = Join-Path $ScriptFolder ("patrick-medication-refill-alert-{0}.html" -f (Get-Date).ToString("yyyy-MM-dd"))
    Set-Content -LiteralPath $OutputPath -Value $HtmlBody -Encoding UTF8

    $PythonCommand = Get-AvailablePythonCommand
    & $PythonCommand $PythonSenderScript --send-now --report-kind medication --file $OutputPath --to ($To -join ",")
    if ($LASTEXITCODE -ne 0) {
      throw $_.Exception
    }
  }
}

function Escape-Html {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) { return "" }
  return [System.Net.WebUtility]::HtmlEncode([string]$Value)
}

function Format-DateLabel {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  return ([datetime]"$Value`T00:00:00").ToString("MMM d, yyyy")
}

function Get-RefillAlert {
  param($Entry)

  $RefillDate = [string]$Entry.refillDate
  if ([string]::IsNullOrWhiteSpace($RefillDate)) { return $null }

  try {
    $Refill = [datetime]"$RefillDate`T00:00:00"
  } catch {
    return $null
  }

  $Today = (Get-Date).Date
  $DiffDays = [math]::Floor(($Refill - $Today).TotalDays)

  if ($DiffDays -lt 0) {
    return [pscustomobject]@{
      Level = "red"
      Label = "Past due refill"
      DiffDays = $DiffDays
    }
  }

  if ($DiffDays -le $AlertWindowDays) {
    $Label = if ($DiffDays -eq 0) { "Refill due today" } else { "Refill due in $DiffDays day" + ($(if ($DiffDays -eq 1) { "" } else { "s" })) }
    return [pscustomobject]@{
      Level = "yellow"
      Label = $Label
      DiffDays = $DiffDays
    }
  }

  return $null
}

function Get-MedicationTask {
  param($TrackerState)

  return @($TrackerState.state.tasks) | Where-Object {
    $Title = [string]$_.title
    $Next = [string]$_.next
    $Notes = [string]$_.notes
    $MedicationEntries = @($_.medications | Where-Object { $null -ne $_ })
    $MedicationEntries.Count -gt 0 -or
    (($Title.ToLowerInvariant().Contains("medication") -and $Title.ToLowerInvariant().Contains("dosage") -and $Title.ToLowerInvariant().Contains("refill"))) -or
    $Next.ToLowerInvariant().Contains("list every current medication") -or
    $Notes.ToLowerInvariant().Contains("track medication details")
  } | Select-Object -First 1
}

function Get-MedicationAlerts {
  param($TrackerState)

  $Task = Get-MedicationTask -TrackerState $TrackerState
  if (-not $Task) { return @() }

  $Entries = @($Task.medications)
  $Alerts = @()

  foreach ($Entry in $Entries) {
    $Alert = Get-RefillAlert -Entry $Entry
    if (-not $Alert) { continue }

    $Alerts += [pscustomobject]@{
      Id = if ($Entry.id) { [string]$Entry.id } else { "" }
      Name = if ($Entry.name) { [string]$Entry.name } else { "Unnamed medication" }
      Dosage = if ($Entry.dosage) { [string]$Entry.dosage } else { "Strength/dosage needed" }
      RefillDate = [string]$Entry.refillDate
      Level = $Alert.Level
      Label = $Alert.Label
      DiffDays = $Alert.DiffDays
      AlertKey = ("{0}|{1}|{2}" -f ($(if ($Entry.id) { [string]$Entry.id } else { [string]$Entry.name })), [string]$Entry.refillDate, $Alert.Level)
    }
  }

  return $Alerts
}

function Get-CurrentMedicationList {
  param($TrackerState)

  $Task = Get-MedicationTask -TrackerState $TrackerState
  if (-not $Task) { return @() }

  return @($Task.medications | Where-Object { $null -ne $_ }) | ForEach-Object {
    [pscustomobject]@{
      Name = if ($_.name) { [string]$_.name } else { "Unnamed medication" }
      Dosage = if ($_.dosage) { [string]$_.dosage } else { "Strength/dosage needed" }
      PillsPrescribed = if ($_.pillsPrescribed) { [string]$_.pillsPrescribed } else { "Not set" }
      RefillDate = if ($_.refillDate) { [string]$_.refillDate } else { "" }
      Alert = Get-RefillAlert -Entry $_
    }
  }
}

function Build-EmailHtml {
  param(
    [array]$Alerts,
    [array]$CurrentMedicationList
  )

  $Rows = ($Alerts | Sort-Object @{ Expression = { if ($_.Level -eq "red") { 0 } else { 1 } } }, RefillDate, Name | ForEach-Object {
    $Bg = if ($_.Level -eq "red") { "#ffe2e0" } else { "#fff7bf" }
    @"
<tr style="background:$Bg;">
  <td style="padding:10px;border:1px solid #d9dee7;"><strong>$(Escape-Html $_.Name)</strong></td>
  <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html $_.Dosage)</td>
  <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html (Format-DateLabel $_.RefillDate))</td>
  <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html $_.Label)</td>
</tr>
"@
  }) -join "`n"

  $MedicationRows = ($CurrentMedicationList | Sort-Object RefillDate, Name | ForEach-Object {
    $MedicationBg = "#ffffff"
    $AlertLabel = "No active alert"
    if ($_.Alert) {
      $MedicationBg = if ($_.Alert.Level -eq "red") { "#ffe2e0" } else { "#fff7bf" }
      $AlertLabel = $_.Alert.Label
    }
    @"
  <tr style="background:$MedicationBg;">
    <td style="padding:10px;border:1px solid #d9dee7;"><strong>$(Escape-Html $_.Name)</strong></td>
    <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html $_.Dosage)</td>
    <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html $_.PillsPrescribed)</td>
    <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html (Format-DateLabel $_.RefillDate))</td>
    <td style="padding:10px;border:1px solid #d9dee7;">$(Escape-Html $AlertLabel)</td>
  </tr>
"@
  }) -join "`n"

  return @"
<html>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;color:#18202a;">
  <div style="max-width:820px;margin:0 auto;background:white;border:1px solid #d9dee7;border-radius:10px;overflow:hidden;">
    <div style="padding:24px 28px;background:#18324d;color:white;">
      <h1 style="margin:0 0 8px;font-size:26px;">Medication Refill Alert</h1>
      <p style="margin:0;color:#dbe7f5;">Generated $(Escape-Html ((Get-Date).ToString("MMM d, yyyy h:mm tt")))</p>
    </div>
      <div style="padding:24px 28px;">
        <p style="margin-top:0;">The tracker found medication refill dates that need attention.</p>
        <ul>
          <li><strong>Yellow</strong>: refill date is within the next $AlertWindowDays days</li>
          <li><strong>Red</strong>: refill date is already past due</li>
        </ul>
        <div style="margin:18px 0 22px;padding:14px 16px;background:#f6f8fb;border:1px solid #d9dee7;border-radius:8px;">
          <div style="font-weight:700;margin-bottom:8px;">Current medication list</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#eef2f7;">
                <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Medication</th>
                <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Dosage</th>
                <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Pills prescribed</th>
                <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Refill date</th>
                <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Status</th>
              </tr>
            </thead>
            <tbody>
              $MedicationRows
            </tbody>
          </table>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#eef2f7;">
            <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Medication</th>
            <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Dosage</th>
            <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Refill date</th>
            <th style="padding:10px;border:1px solid #d9dee7;text-align:left;">Alert</th>
          </tr>
        </thead>
        <tbody>
          $Rows
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
"@
}

function Invoke-MedicationRefillAlertCheck {
  $Config = Get-SupabaseConfig -Path $ConfigPath
  $TrackerState = Get-TrackerState -Config $Config
  $Checkpoint = Load-Checkpoint
  $Alerts = @(Get-MedicationAlerts -TrackerState $TrackerState)
  $CurrentMedicationList = @(Get-CurrentMedicationList -TrackerState $TrackerState)

  $OpenKeys = @{}
  foreach ($Alert in $Alerts) { $OpenKeys[$Alert.AlertKey] = $true }

  $Existing = @{}
  foreach ($Property in $Checkpoint.alerts.PSObject.Properties) {
    if ($OpenKeys.ContainsKey($Property.Name)) {
      $Existing[$Property.Name] = $Property.Value
    }
  }
  $Checkpoint.alerts = $Existing

  foreach ($Alert in $Alerts) {
    $Checkpoint.alerts[$Alert.AlertKey] = @{
      name = $Alert.Name
      refillDate = $Alert.RefillDate
      level = $Alert.Level
      lastSeenAt = (Get-Date).ToString("o")
    }
  }

  if (-not $Alerts.Count) {
    Save-Checkpoint -Checkpoint $Checkpoint
    Write-Host "No active medication refill alerts detected."
    return
  }

  $Subject = "Medication Refill Alert - Patrick Glanville Support Tracker"
  $HtmlBody = Build-EmailHtml -Alerts $Alerts -CurrentMedicationList $CurrentMedicationList
  Send-HtmlMailWithPythonFallback -To $Recipients -Subject $Subject -HtmlBody $HtmlBody
  Save-Checkpoint -Checkpoint $Checkpoint
  Write-Host ("Sent daily medication refill alert email for {0} active item(s)." -f $Alerts.Count)
}

if ($Once) {
  Invoke-MedicationRefillAlertCheck
  exit 0
}

Write-Host "Watching Supabase for medication refill alerts..."
Write-Host "Polling interval: $IntervalSeconds seconds"
Write-Host "Recipients: $($Recipients -join ', ')"
Write-Host "Press Ctrl+C to stop."

while ($true) {
  try {
    Invoke-MedicationRefillAlertCheck
  } catch {
    Write-Warning $_.Exception.Message
  }

  Start-Sleep -Seconds $IntervalSeconds
}
