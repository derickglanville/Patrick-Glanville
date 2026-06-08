param(
  [switch]$OpenDraft,
  [switch]$GenerateOnly,
  [switch]$Send
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectFolder = Split-Path -Parent $ScriptFolder
$ConfigPath = Join-Path $ProjectFolder "supabase-config.js"
$SenderScript = Join-Path $ScriptFolder "Send-RichUrgencyReport.ps1"
$ArchiveFolder = Join-Path $ScriptFolder "Archive"
$OutputPath = Join-Path $ScriptFolder ("patrick-urgency-report-{0}.html" -f (Get-Date).ToString("yyyy-MM-dd"))

$CategoryOrder = @(
  "Job - CloudResearch",
  "Job - Data Annotation",
  "Job - Prolific",
  "Job - Mercor",
  "Job - Easy Money (Home Depot, Amazon, Lowe's)",
  "Income",
  "Benefits",
  "Cash",
  "Transportation",
  "Transportation - Turo rental",
  "Vehicle",
  "Debt",
  "Debt - lender hardship",
  "Health",
  "Insurance",
  "Medical bills",
  "Household tasks",
  "Home safety",
  "Family",
  "Plan",
  "Accountability",
  "N/A"
)

function Escape-Html {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) { return "" }

  $Encoded = [System.Net.WebUtility]::HtmlEncode([string]$Value)
  return $Encoded.Replace("'", "&#39;")
}

function Format-DateTimeLabel {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }

  return ([datetime]$Value).ToString("MMM d, yyyy, h:mm tt")
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

function Value-OrDefault {
  param(
    [AllowNull()][object]$Value,
    [string]$Default
  )

  if ($null -eq $Value) { return $Default }

  $Text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($Text)) { return $Default }

  return $Text
}

function Get-TodayIsoDate {
  return (Get-Date).ToString("yyyy-MM-dd")
}

function Is-PastDue {
  param($Task)

  if ([string]::IsNullOrWhiteSpace($Task.due) -or $Task.status -eq "Done") { return $false }
  return [string]$Task.due -lt (Get-TodayIsoDate)
}

function Get-DueDateLabel {
  param($Task)

  $Due = if ([string]::IsNullOrWhiteSpace($Task.due)) { "No due date set" } else { [string]$Task.due }
  if (Is-PastDue $Task) {
    return "$Due - PAST DUE"
  }

  return $Due
}

function Is-JobTask {
  param($Task)

  return ([string]$Task.category).StartsWith("Job -")
}

function Get-CategoryRank {
  param([AllowNull()][string]$Category)

  $Index = [array]::IndexOf($CategoryOrder, $Category)
  if ($Index -lt 0) { return [int]::MaxValue }
  return $Index
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

function Get-UrgentTasks {
  param($State)

  $Tasks = @($State.tasks) | Where-Object { $_.priority -eq "Urgent" }

  return $Tasks | Sort-Object `
    @{ Expression = { Get-CategoryRank ([string]$_.category) } }, `
    @{ Expression = {
        if ([string]::IsNullOrWhiteSpace($_.due)) { "9999-12-31" } else { [string]$_.due }
      }
    }, `
    @{ Expression = { [string]$_.title } }
}

function Get-MetricHtml {
  param($Value, [string]$Label)

  return "<article class=`"metric`"><strong>$(Escape-Html $Value)</strong><span>$(Escape-Html $Label)</span></article>"
}

function Get-TaskHtml {
  param($Task)

  $PastDue = Is-PastDue $Task
  $DueClass = if ($PastDue) { "due-past" } else { "" }
  $TaskClass = if ($PastDue) { "task task-overdue" } else { "task" }
  $OverdueBadge = if ($PastDue) { '<span class="overdue">Red Flag: Past Due</span>' } else { "" }

  return @"
<article class="$TaskClass">
  <h3>$(Escape-Html $Task.title) $OverdueBadge<span class="badge">Urgent</span></h3>
  <table class="meta">
    <tr>
      <th>Due</th><th>Status</th><th>Complete</th><th>Owner</th><th>Category</th>
    </tr>
    <tr>
      <td class="$DueClass">$(Escape-Html (Get-DueDateLabel $Task))</td>
      <td>$(Escape-Html (Value-OrDefault $Task.status "N/A"))</td>
      <td>$(Normalize-Percent $Task.percent)%</td>
      <td>$(Escape-Html (Value-OrDefault $Task.owner "No owner"))</td>
      <td>$(Escape-Html (Value-OrDefault $Task.category "N/A"))</td>
    </tr>
  </table>
  <p><span class="label">What is due:</span> $(Escape-Html (Value-OrDefault $Task.next "No next step recorded."))</p>
  <p><span class="label">Context:</span> $(Escape-Html (Value-OrDefault $Task.notes "No notes recorded."))</p>
</article>
"@
}

function Get-SectionHtml {
  param(
    [string]$Title,
    [array]$Tasks,
    [bool]$IsJobSection
  )

  $Empty = if ($IsJobSection) { "No urgent job tasks currently listed." } else { "No other urgent tasks currently listed." }
  $SectionClass = if ($IsJobSection) { "section job-section" } else { "section" }
  $TaskHtml = if ($Tasks.Count) {
    ($Tasks | ForEach-Object { Get-TaskHtml $_ }) -join "`n"
  } else {
    "<p class=`"empty`">$(Escape-Html $Empty)</p>"
  }

  return @"
<section class="$SectionClass">
  <div class="section-title"><h2>$(Escape-Html $Title)</h2></div>
  $TaskHtml
</section>
"@
}

function Build-UrgencyReportHtml {
  param($StateRow)

  $UrgentTasks = @(Get-UrgentTasks $StateRow.state)
  $JobTasks = @($UrgentTasks | Where-Object { Is-JobTask $_ })
  $OtherTasks = @($UrgentTasks | Where-Object { -not (Is-JobTask $_) })
  $Completed = @($UrgentTasks | Where-Object { $_.status -eq "Done" }).Count
  $Blocked = @($UrgentTasks | Where-Object { $_.status -eq "Blocked" }).Count
  $Average = if ($UrgentTasks.Count) {
    $PercentTotal = 0
    foreach ($Task in $UrgentTasks) {
      $PercentTotal += Normalize-Percent $Task.percent
    }
    [int][math]::Round($PercentTotal / $UrgentTasks.Count)
  } else {
    0
  }
  $Generated = Format-DateTimeLabel ((Get-Date).ToString("o"))

  return @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Glanville Urgency Report</title>
  <style>
    body { margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }
    .wrap { max-width: 960px; margin: 0 auto; background: #ffffff; }
    .header { padding: 28px 32px; background: #18324d; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; color: #dbe7f5; }
    .content { padding: 26px 32px 34px; }
    .notice { margin: 0 0 18px; padding: 12px 14px; background: #fff8d6; border: 1px solid #e5cd63; border-radius: 6px; }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0 22px; }
    .metric { border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }
    .metric strong { display: block; font-size: 24px; color: #2f6db7; }
    .metric span { color: #5b6573; font-size: 13px; }
    .section { margin-top: 22px; }
    .section-title { border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; }
    .section-title h2 { margin: 0; font-size: 20px; }
    .job-section { border: 2px solid #2f6db7; border-radius: 8px; padding: 16px; background: #f2f7ff; }
    .task { border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; margin-top: 12px; background: #ffffff; }
    .task-overdue { border-color: #b63b3b; box-shadow: inset 4px 0 0 #b63b3b; }
    .task h3 { margin: 0 0 10px; font-size: 18px; }
    .meta { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .meta th { text-align: left; color: #5b6573; font-size: 12px; text-transform: uppercase; padding: 6px 8px 2px 0; }
    .meta td { padding: 2px 8px 8px 0; vertical-align: top; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #ffe1df; color: #8d2424; font-weight: 700; font-size: 12px; }
    .overdue { display: inline-block; margin-right: 8px; padding: 4px 8px; border-radius: 999px; background: #b63b3b; color: #ffffff; font-weight: 700; font-size: 12px; }
    .due-past { color: #8d2424; font-weight: 700; }
    .label { font-weight: 700; }
    .empty { color: #5b6573; }
    .footer { padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Glanville Urgency Report</h1>
      <p>Generated $(Escape-Html $Generated) | Scheduled daily send time: 9:30 AM</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Job focus:</strong> Job and income opportunities are grouped first because restoring income is the highest leverage path for transportation, housing, debt, and daily living stability.</p>
      <div class="metrics">
        $(Get-MetricHtml $UrgentTasks.Count "urgent tasks")
        $(Get-MetricHtml $JobTasks.Count "urgent job tasks")
        $(Get-MetricHtml $Completed "completed")
        $(Get-MetricHtml $Blocked "blocked")
        $(Get-MetricHtml "$Average%" "average complete")
      </div>
      $(Get-SectionHtml "Job Search and Income Opportunities" $JobTasks $true)
      $(Get-SectionHtml "Other Urgent Tasks" $OtherTasks $false)
    </section>
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker and saved into the local Email folder for automatic sending.</footer>
  </main>
</body>
</html>
"@
}

function Archive-PreviousUrgencyReports {
  param(
    [string]$SourceFolder,
    [string]$ArchiveFolder,
    [string]$CurrentOutputPath
  )

  if (-not (Test-Path -LiteralPath $ArchiveFolder)) {
    New-Item -ItemType Directory -Path $ArchiveFolder | Out-Null
  }

  $CurrentOutputName = [System.IO.Path]::GetFileName($CurrentOutputPath)
  $ExistingReports = Get-ChildItem -LiteralPath $SourceFolder -Filter "patrick-urgency-report-*.html" -File -ErrorAction SilentlyContinue

  foreach ($Report in $ExistingReports) {
    if ($Report.Name -eq $CurrentOutputName) {
      continue
    }

    $ArchivePath = Join-Path $ArchiveFolder $Report.Name
    Move-Item -LiteralPath $Report.FullName -Destination $ArchivePath -Force
  }
}

$Config = Get-SupabaseConfig -Path $ConfigPath
$StateRow = Get-TrackerState -Config $Config
$Html = Build-UrgencyReportHtml -StateRow $StateRow

Archive-PreviousUrgencyReports -SourceFolder $ScriptFolder -ArchiveFolder $ArchiveFolder -CurrentOutputPath $OutputPath
Set-Content -LiteralPath $OutputPath -Value $Html -Encoding UTF8
Write-Host "Saved urgency report to: $OutputPath"

if ($GenerateOnly -or (-not $OpenDraft -and -not $Send)) {
  Write-Host "Generate-only mode: skipping email send."
  exit 0
}

if ($OpenDraft) {
  & $SenderScript -ReportPath $OutputPath
} else {
  & $SenderScript -ReportPath $OutputPath -Send
}
