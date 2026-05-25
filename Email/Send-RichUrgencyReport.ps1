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

try {
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
} catch {
  $Subject = [uri]::EscapeDataString("Patrick Glanville Urgency Report - $ReportDate")
  $To = [uri]::EscapeDataString(($Recipients -join ","))
  $Body = [uri]::EscapeDataString("Please see the rich HTML urgency report. Attach the report file or open it and copy the formatted report into this email.`n`nReport file: $ReportPath")
  $GmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=$To&su=$Subject&body=$Body"

  Start-Process $GmailUrl
  Start-Process -FilePath $ReportPath

  Write-Warning "Outlook desktop is not available or not registered on this machine."
  Write-Host "Opened Gmail compose and the HTML report file."
  Write-Host "Attach the report file or copy the formatted report into the email body before sending."
}
