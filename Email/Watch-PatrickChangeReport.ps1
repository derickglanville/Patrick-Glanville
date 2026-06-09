param(
  [int]$IntervalSeconds = 60,
  [switch]$Once
)

$ErrorActionPreference = "Stop"

$PatrickEmail = "patrick.glanville@gmail.com"
$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ConfigPath = Join-Path $ProjectFolder "supabase-config.js"
$RunnerScript = Join-Path $ScriptFolder "Invoke-PatrickChangeReport.ps1"
$CheckpointPath = Join-Path $ScriptFolder "patrick-change-report-watcher-state.json"

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
    [string]$PatrickHistoryAt,
    [string]$ReportDate,
    [string]$LastEmailHourBucket,
    [string]$LastEmailedPatrickHistoryAt
  )

  [pscustomobject]@{
    updatedAt = $UpdatedAt
    patrickHistoryAt = $PatrickHistoryAt
    reportDate = $ReportDate
    lastEmailHourBucket = $LastEmailHourBucket
    lastEmailedPatrickHistoryAt = $LastEmailedPatrickHistoryAt
    savedAt = (Get-Date).ToString("o")
  } | ConvertTo-Json | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Get-TodayIsoDate {
  return (Get-Date).ToString("yyyy-MM-dd")
}

function Get-LatestPatrickHistoryAt {
  param($TrackerState)

  $AllPatrickEntries = @($TrackerState.state.history) | Where-Object { $_.userEmail -eq $PatrickEmail } | Sort-Object createdAt
  if (-not $AllPatrickEntries.Count) { return "" }
  return ($AllPatrickEntries | Select-Object -Last 1).createdAt
}

function Get-LocalHourBucket {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }

  try {
    return ([datetime]$Value).ToLocalTime().ToString("yyyy-MM-ddTHH")
  } catch {
    return ""
  }
}

function Get-LatestPatrickEntry {
  param($TrackerState)

  $AllPatrickEntries = @($TrackerState.state.history) |
    Where-Object { $_.userEmail -eq $PatrickEmail } |
    Sort-Object createdAt

  if (-not $AllPatrickEntries.Count) { return $null }
  return ($AllPatrickEntries | Select-Object -Last 1)
}

function Invoke-PatrickChangeReportCheck {
  $Config = Get-SupabaseConfig -Path $ConfigPath
  $TrackerState = Get-TrackerState -Config $Config
  $Checkpoint = Load-Checkpoint
  $LatestPatrickEntry = Get-LatestPatrickEntry -TrackerState $TrackerState
  $LatestPatrickHistoryAt = Get-LatestPatrickHistoryAt -TrackerState $TrackerState
  $LatestPatrickHourBucket = if ($LatestPatrickEntry) { Get-LocalHourBucket $LatestPatrickEntry.createdAt } else { "" }
  $Today = Get-TodayIsoDate

  if (-not $Checkpoint) {
    & powershell -ExecutionPolicy Bypass -File $RunnerScript -GenerateOnly
    Save-Checkpoint `
      -UpdatedAt $TrackerState.updated_at `
      -PatrickHistoryAt $LatestPatrickHistoryAt `
      -ReportDate $Today `
      -LastEmailHourBucket "" `
      -LastEmailedPatrickHistoryAt ""
    Write-Host "Bootstrapped Patrick change report watcher and generated today's report."
    return
  }

  $NeedsRefresh = $false

  if ($Checkpoint.reportDate -ne $Today) {
    $NeedsRefresh = $true
  }

  if ($LatestPatrickHistoryAt -and ([string]$LatestPatrickHistoryAt -gt [string]$Checkpoint.patrickHistoryAt)) {
    $NeedsRefresh = $true
  }

  if (-not $NeedsRefresh) {
    Write-Host "No new Patrick change-report updates detected."
    return
  }

  $ShouldSendHourlyEmail = $false

  if (
    $LatestPatrickHistoryAt -and
    ([string]$LatestPatrickHistoryAt -gt [string]$Checkpoint.lastEmailedPatrickHistoryAt) -and
    $LatestPatrickHourBucket -and
    ([string]$LatestPatrickHourBucket -ne [string]$Checkpoint.lastEmailHourBucket)
  ) {
    $ShouldSendHourlyEmail = $true
  }

  if ($ShouldSendHourlyEmail) {
    & powershell -ExecutionPolicy Bypass -File $RunnerScript -SendNow
    Save-Checkpoint `
      -UpdatedAt $TrackerState.updated_at `
      -PatrickHistoryAt $LatestPatrickHistoryAt `
      -ReportDate $Today `
      -LastEmailHourBucket $LatestPatrickHourBucket `
      -LastEmailedPatrickHistoryAt $LatestPatrickHistoryAt
    Write-Host "Updated Patrick change report and sent the hourly Patrick change email."
    return
  }

  & powershell -ExecutionPolicy Bypass -File $RunnerScript -GenerateOnly
  Save-Checkpoint `
    -UpdatedAt $TrackerState.updated_at `
    -PatrickHistoryAt $LatestPatrickHistoryAt `
    -ReportDate $Today `
    -LastEmailHourBucket $Checkpoint.lastEmailHourBucket `
    -LastEmailedPatrickHistoryAt $Checkpoint.lastEmailedPatrickHistoryAt
  Write-Host "Updated Patrick change report in the Email folder."
}

if ($Once) {
  Invoke-PatrickChangeReportCheck
  exit 0
}

Write-Host "Watching Supabase for Patrick change-report updates..."
Write-Host "Polling interval: $IntervalSeconds seconds"
Write-Host "Press Ctrl+C to stop."

while ($true) {
  try {
    Invoke-PatrickChangeReportCheck
  } catch {
    Write-Warning $_.Exception.Message
  }

  Start-Sleep -Seconds $IntervalSeconds
}
