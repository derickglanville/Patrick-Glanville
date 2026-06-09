param(
  [switch]$GenerateOnly,
  [switch]$SendNow
)

$ErrorActionPreference = "Stop"

$PatrickEmail = "patrick.glanville@gmail.com"
$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ConfigPath = Join-Path $ProjectFolder "supabase-config.js"
$DailyEmailScript = Join-Path $ProjectFolder "Scripts\send_daily_email.py"
$ArchiveFolder = Join-Path $ScriptFolder "Archive"
$OutputPath = Join-Path $ScriptFolder ("patrick-change-report-{0}.html" -f (Get-Date).ToString("yyyy-MM-dd"))

function Escape-Html {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) { return "" }

  $Encoded = [System.Net.WebUtility]::HtmlEncode([string]$Value)
  return $Encoded.Replace("'", "&#39;")
}

function Format-DateTimeLabel {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  return ([datetime]$Value).ToLocalTime().ToString("MMM d, yyyy, h:mm tt")
}

function Normalize-Percent {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return 0 }

  try {
    return [int][math]::Round([double]$Value)
  } catch {
    return 0
  }
}

function Get-TodayIsoDate {
  return (Get-Date).ToString("yyyy-MM-dd")
}

function Get-LocalIsoDate {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  try {
    return ([datetime]$Value).ToLocalTime().ToString("yyyy-MM-dd")
  } catch {
    return ""
  }
}

function Get-ItemTypeLabel {
  param([AllowNull()][string]$Type)

  $NormalizedType = if ($null -eq $Type) { "" } else { [string]$Type }

  switch ($NormalizedType.ToLowerInvariant()) {
    "task" { return "Task" }
    "bill" { return "Bill" }
    "lifeadmin" { return "To-Do Note" }
    "document" { return "PDF" }
    "runningnote" { return "Running Note" }
    default { return "Change" }
  }
}

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

function Get-PatrickEntriesForToday {
  param($StateRow)

  $Today = Get-TodayIsoDate
  return @($StateRow.state.history) | Where-Object {
    $_.userEmail -eq $PatrickEmail -and
    (Get-LocalIsoDate $_.createdAt) -eq $Today
  } | Sort-Object createdAt -Descending
}

function Get-MetricHtml {
  param($Value, [string]$Label)

  return "<article class=`"metric`"><strong>$(Escape-Html $Value)</strong><span>$(Escape-Html $Label)</span></article>"
}

function Get-EntryHtml {
  param($Entry)

  $ItemTypeLabel = Get-ItemTypeLabel -Type $Entry.itemType
  $UserLabel = if ([string]::IsNullOrWhiteSpace([string]$Entry.userName)) { "Unknown user" } else { [string]$Entry.userName }

  return @"
<article class="change-item">
  <div class="change-heading">
    <span class="change-badge change-badge-type">$(Escape-Html $ItemTypeLabel)</span>
    <span class="change-badge change-badge-user">$(Escape-Html $UserLabel)</span>
    <strong>$(Escape-Html $Entry.taskTitle)</strong>
  </div>
  <p class="change-time">$(Escape-Html (Format-DateTimeLabel $Entry.createdAt))</p>
  <p>$(Escape-Html $Entry.summary)</p>
  <p><strong>Status:</strong> $(Escape-Html $Entry.status) | <strong>Complete:</strong> $(Normalize-Percent $Entry.percent)%</p>
</article>
"@
}

function Get-ReportSectionHtml {
  param(
    [string]$Title,
    [array]$Entries,
    [string]$EmptyMessage
  )

  $BodyHtml = if ($Entries.Count) {
    ($Entries | ForEach-Object { Get-EntryHtml $_ }) -join "`n"
  } else {
    "<p class=`"empty`">$(Escape-Html $EmptyMessage)</p>"
  }

  return @"
<section class="section">
  <div class="section-title">
    <h2>$(Escape-Html $Title)</h2>
    <span>$($Entries.Count) item$(if ($Entries.Count -eq 1) { "" } else { "s" })</span>
  </div>
  $BodyHtml
</section>
"@
}

function Build-PatrickChangeReportHtml {
  param($StateRow)

  $Entries = @(Get-PatrickEntriesForToday -StateRow $StateRow)
  $ClosedEntries = @($Entries | Where-Object { $_.status -eq "Done" })
  $UniqueItems = @($Entries | ForEach-Object { if ($_.taskId) { $_.taskId } else { "$($_.itemType):$($_.itemId):$($_.taskTitle)" } } | Select-Object -Unique)
  $Generated = Format-DateTimeLabel ((Get-Date).ToString("o"))
  $Latest = if ($Entries.Count) { Format-DateTimeLabel $Entries[0].createdAt } else { "None" }

  return @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Change Report</title>
  <style>
    body { margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }
    .wrap { max-width: 980px; margin: 0 auto; background: #ffffff; }
    .header { padding: 28px 32px; background: #18324d; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; color: #dbe7f5; }
    .content { padding: 26px 32px 34px; }
    .notice { margin: 0 0 18px; padding: 12px 14px; background: #eef3fb; border: 1px solid #c7d7ea; border-radius: 6px; }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0 22px; }
    .metric { border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }
    .metric strong { display: block; font-size: 22px; color: #2f6db7; }
    .metric span { color: #5b6573; font-size: 13px; }
    .section { margin-top: 22px; }
    .section-title { border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; display:flex; justify-content:space-between; gap:12px; align-items:center; }
    .section-title h2 { margin: 0; font-size: 20px; }
    .section-title span { color: #5b6573; font-weight: 700; }
    .change-item { border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; margin-top: 12px; background: #ffffff; }
    .change-heading { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .change-badge { display:inline-block; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; }
    .change-badge-type { background:#eef3fb; border:1px solid #c7d7ea; color:#315b8a; }
    .change-badge-user { background:#f4ecff; border:1px solid #d4c0f7; color:#6b35a8; }
    .change-time, .empty { color:#5b6573; }
    .footer { padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Change Report</h1>
      <p>Generated $(Escape-Html $Generated) | Report date $(Escape-Html (Get-TodayIsoDate))</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Source:</strong> This report is generated from Supabase tracker history for Patrick's changes recorded today, including closed items.</p>
      <div class="metrics">
        $(Get-MetricHtml $Entries.Count "Patrick changes today")
        $(Get-MetricHtml $ClosedEntries.Count "closed today")
        $(Get-MetricHtml $UniqueItems.Count "unique items touched")
        $(Get-MetricHtml $Latest "latest update")
        $(Get-MetricHtml (Get-TodayIsoDate) "report date")
      </div>
      $(Get-ReportSectionHtml "Today's Patrick Changes" $Entries "No Patrick changes were captured for today.")
      $(Get-ReportSectionHtml "Items Patrick Closed Today" $ClosedEntries "Patrick has not closed any tracked items today.")
    </section>
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker and saved into the local Email folder for reporting and archive purposes.</footer>
  </main>
</body>
</html>
"@
}

function Archive-PreviousPatrickChangeReports {
  param(
    [string]$SourceFolder,
    [string]$ArchiveFolder,
    [string]$CurrentOutputPath
  )

  if (-not (Test-Path -LiteralPath $ArchiveFolder)) {
    New-Item -ItemType Directory -Path $ArchiveFolder | Out-Null
  }

  $CurrentOutputName = [System.IO.Path]::GetFileName($CurrentOutputPath)
  $ExistingReports = Get-ChildItem -LiteralPath $SourceFolder -Filter "patrick-change-report-*.html" -File -ErrorAction SilentlyContinue

  $ArchivedPaths = @()

  foreach ($Report in $ExistingReports) {
    if ($Report.Name -eq $CurrentOutputName) {
      continue
    }

    $ArchivePath = Join-Path $ArchiveFolder $Report.Name
    Move-Item -LiteralPath $Report.FullName -Destination $ArchivePath -Force
    $ArchivedPaths += $ArchivePath
  }

  return $ArchivedPaths
}

function Get-PythonCommand {
  $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($PythonCommand) {
    return @($PythonCommand.Source)
  }

  $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($PyLauncher) {
    return @($PyLauncher.Source, "-3")
  }

  throw "Python was not found on this machine. Could not run $DailyEmailScript"
}

function Send-CurrentPatrickChangeReport {
  param([string]$ReportPath)

  if (-not (Test-Path -LiteralPath $DailyEmailScript)) {
    throw "Missing daily email sender script: $DailyEmailScript"
  }

  if (-not (Test-Path -LiteralPath $ReportPath)) {
    throw "Missing Patrick change report file: $ReportPath"
  }

  $PythonCommand = Get-PythonCommand
  $Command = @($PythonCommand + @($DailyEmailScript, "--send-now", "--report-kind", "change", "--file", $ReportPath))
  & $Command[0] $Command[1..($Command.Count - 1)]
}

$Config = Get-SupabaseConfig -Path $ConfigPath
$StateRow = Get-TrackerState -Config $Config
$Html = Build-PatrickChangeReportHtml -StateRow $StateRow

$ArchivedReportPaths = @(Archive-PreviousPatrickChangeReports -SourceFolder $ScriptFolder -ArchiveFolder $ArchiveFolder -CurrentOutputPath $OutputPath)
Set-Content -LiteralPath $OutputPath -Value $Html -Encoding UTF8
Write-Host "Saved Patrick change report to: $OutputPath"

if ($ArchivedReportPaths.Count) {
  Write-Host "Archived Patrick change report(s): $($ArchivedReportPaths -join ', ')"
}

if ($GenerateOnly) {
  Write-Host "Generate-only mode complete."
}

if ($SendNow) {
  Send-CurrentPatrickChangeReport -ReportPath $OutputPath
}
