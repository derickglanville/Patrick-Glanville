param(
  [switch]$Send
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SenderScript = Join-Path $ScriptFolder "Send-RichUrgencyReport.ps1"

if (-not (Test-Path -LiteralPath $SenderScript)) {
  throw "Missing sender script: $SenderScript"
}

Write-Host "Watching for rich urgency reports in: $ScriptFolder"
Write-Host "Save files named patrick-urgency-report-*.html into this folder."
if ($Send) {
  Write-Host "Mode: send immediately"
} else {
  Write-Host "Mode: open Outlook draft for review"
}
Write-Host "Press Ctrl+C to stop."

$KnownFiles = @{}
Get-ChildItem -LiteralPath $ScriptFolder -Filter "patrick-urgency-report-*.html" -ErrorAction SilentlyContinue |
  ForEach-Object { $KnownFiles[$_.FullName] = $_.LastWriteTimeUtc }

while ($true) {
  Start-Sleep -Seconds 2

  $Reports = Get-ChildItem -LiteralPath $ScriptFolder -Filter "patrick-urgency-report-*.html" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc

  foreach ($Report in $Reports) {
    $AlreadyHandled = $KnownFiles.ContainsKey($Report.FullName) -and
      $KnownFiles[$Report.FullName] -eq $Report.LastWriteTimeUtc

    if ($AlreadyHandled) {
      continue
    }

    $KnownFiles[$Report.FullName] = $Report.LastWriteTimeUtc

    try {
      Write-Host "Processing report: $($Report.Name)"
      if ($Send) {
        & $SenderScript -ReportPath $Report.FullName -Send
      } else {
        & $SenderScript -ReportPath $Report.FullName
      }
    } catch {
      Write-Warning "Could not process $($Report.Name): $($_.Exception.Message)"
    }
  }
}
