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

$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)
$Mail.To = ($Recipients -join ";")
$Mail.Subject = "Patrick Glanville Urgency Report - $ReportDate"
$Mail.HTMLBody = $HtmlBody
$Mail.Attachments.Add($ReportPath) | Out-Null

if ($Send) {
  $Mail.Send()
  Write-Host "Sent rich urgency report to: $($Recipients -join ', ')"
} else {
  $Mail.Display()
  Write-Host "Opened Outlook draft for: $($Recipients -join ', ')"
}
