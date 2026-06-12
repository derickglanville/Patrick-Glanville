param(
  [int]$IntervalSeconds = 3600,
  [switch]$Once
)

$ErrorActionPreference = "Stop"

$PatrickEmail = "patrick.glanville@gmail.com"
$ScriptFolder = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $PSCommandPath }
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ArchiveFolder = Join-Path $ScriptFolder "Archive"
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
    [string]$LastCompletedHourBucketEmailed
  )

  [pscustomobject]@{
    updatedAt = $UpdatedAt
    patrickHistoryAt = $PatrickHistoryAt
    reportDate = $ReportDate
    lastCompletedHourBucketEmailed = $LastCompletedHourBucketEmailed
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

function Get-HourBucketForDateTime {
  param([datetime]$Value)

  return $Value.ToString("yyyy-MM-ddTHH")
}

function Get-PreviousCompletedHourWindow {
  $NowLocal = (Get-Date)
  $CurrentHourStart = Get-Date -Year $NowLocal.Year -Month $NowLocal.Month -Day $NowLocal.Day -Hour $NowLocal.Hour -Minute 0 -Second 0
  $PreviousHourStart = $CurrentHourStart.AddHours(-1)

  return [pscustomobject]@{
    Start = $PreviousHourStart
    End = $CurrentHourStart
    Bucket = Get-HourBucketForDateTime -Value $PreviousHourStart
    Label = "{0} to {1} America/New_York" -f $PreviousHourStart.ToString("MMM d, yyyy h:mm tt"), $CurrentHourStart.AddSeconds(-1).ToString("h:mm:ss tt")
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

function Get-PatrickEntriesForHourWindow {
  param(
    $TrackerState,
    [datetime]$LocalStart,
    [datetime]$LocalEnd
  )

  return @($TrackerState.state.history) | Where-Object {
    if ($_.userEmail -ne $PatrickEmail) {
      return $false
    }

    try {
      $LocalCreatedAt = ([datetime]$_.createdAt).ToLocalTime()
      return ($LocalCreatedAt -ge $LocalStart) -and ($LocalCreatedAt -lt $LocalEnd)
    } catch {
      return $false
    }
  } | Sort-Object createdAt -Descending
}

function Invoke-RunnerScript {
  param([string[]]$Arguments)

  & powershell -ExecutionPolicy Bypass -File $RunnerScript @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Patrick change report runner failed with exit code $LASTEXITCODE."
  }
}

function Invoke-PatrickChangeReportCheck {
  $Config = Get-SupabaseConfig -Path $ConfigPath
  $TrackerState = Get-TrackerState -Config $Config
  $Checkpoint = Load-Checkpoint
  $LatestPatrickHistoryAt = Get-LatestPatrickHistoryAt -TrackerState $TrackerState
  $Today = Get-TodayIsoDate
  $PreviousHourWindow = Get-PreviousCompletedHourWindow
  $PreviousHourEntries = @(Get-PatrickEntriesForHourWindow -TrackerState $TrackerState -LocalStart $PreviousHourWindow.Start -LocalEnd $PreviousHourWindow.End)

  if (-not $Checkpoint) {
    Invoke-RunnerScript -Arguments @("-GenerateOnly")
    Save-Checkpoint `
      -UpdatedAt $TrackerState.updated_at `
      -PatrickHistoryAt $LatestPatrickHistoryAt `
      -ReportDate $Today `
      -LastCompletedHourBucketEmailed ""
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
    if ($PreviousHourEntries.Count -and ([string]$Checkpoint.lastCompletedHourBucketEmailed -ne [string]$PreviousHourWindow.Bucket)) {
      $HourlyOutputPath = Join-Path $ArchiveFolder ("patrick-change-report-{0}.html" -f $PreviousHourWindow.Bucket.Replace(":", "").Replace("T", "-"))
      Invoke-RunnerScript -Arguments @(
        "-SendNow",
        "-RangeStartLocal", $PreviousHourWindow.Start.ToString("yyyy-MM-dd HH:mm:ss"),
        "-RangeEndLocal", $PreviousHourWindow.End.ToString("yyyy-MM-dd HH:mm:ss"),
        "-ReportLabel", $PreviousHourWindow.Label,
        "-CustomOutputPath", $HourlyOutputPath
      )
      Save-Checkpoint `
        -UpdatedAt $TrackerState.updated_at `
        -PatrickHistoryAt $LatestPatrickHistoryAt `
        -ReportDate $Today `
        -LastCompletedHourBucketEmailed $PreviousHourWindow.Bucket
      Write-Host "Sent Patrick change report summary for completed hour $($PreviousHourWindow.Bucket)."
      return
    }

    Write-Host "No new Patrick change-report updates detected."
    return
  }

  Invoke-RunnerScript -Arguments @("-GenerateOnly")
  Save-Checkpoint `
    -UpdatedAt $TrackerState.updated_at `
    -PatrickHistoryAt $LatestPatrickHistoryAt `
    -ReportDate $Today `
    -LastCompletedHourBucketEmailed $Checkpoint.lastCompletedHourBucketEmailed
  Write-Host "Updated Patrick change report in the Email folder."

  if ($PreviousHourEntries.Count -and ([string]$Checkpoint.lastCompletedHourBucketEmailed -ne [string]$PreviousHourWindow.Bucket)) {
    $HourlyOutputPath = Join-Path $ArchiveFolder ("patrick-change-report-{0}.html" -f $PreviousHourWindow.Bucket.Replace(":", "").Replace("T", "-"))
    Invoke-RunnerScript -Arguments @(
      "-SendNow",
      "-RangeStartLocal", $PreviousHourWindow.Start.ToString("yyyy-MM-dd HH:mm:ss"),
      "-RangeEndLocal", $PreviousHourWindow.End.ToString("yyyy-MM-dd HH:mm:ss"),
      "-ReportLabel", $PreviousHourWindow.Label,
      "-CustomOutputPath", $HourlyOutputPath
    )
    Save-Checkpoint `
      -UpdatedAt $TrackerState.updated_at `
      -PatrickHistoryAt $LatestPatrickHistoryAt `
      -ReportDate $Today `
      -LastCompletedHourBucketEmailed $PreviousHourWindow.Bucket
    Write-Host "Sent Patrick change report summary for completed hour $($PreviousHourWindow.Bucket)."
  }
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
