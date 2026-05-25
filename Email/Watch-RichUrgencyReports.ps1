param(
  [switch]$Send
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$SenderScript = Join-Path $ScriptFolder "Send-RichUrgencyReport.ps1"
$DownloadFolder = Join-Path $env:USERPROFILE "Downloads"

if (-not (Test-Path -LiteralPath $SenderScript)) {
  throw "Missing sender script: $SenderScript"
}

Write-Host "Watching for rich urgency reports in:"
Write-Host " - $ScriptFolder"
Write-Host " - $DownloadFolder"
Write-Host "Save files named patrick-urgency-report-*.html into either folder."
if ($Send) {
  Write-Host "Mode: send immediately"
} else {
  Write-Host "Mode: open Outlook draft for review"
}
Write-Host "Press Ctrl+C to stop."

$KnownFiles = @{}
$WatchFolders = @($ScriptFolder)
if (Test-Path -LiteralPath $DownloadFolder) {
  $WatchFolders += $DownloadFolder
}

foreach ($Folder in $WatchFolders) {
  Get-ChildItem -LiteralPath $Folder -Filter "patrick-urgency-report-*.html" -ErrorAction SilentlyContinue |
  ForEach-Object { $KnownFiles[$_.FullName] = $_.LastWriteTimeUtc }
}

while ($true) {
  Start-Sleep -Seconds 2

  $Reports = foreach ($Folder in $WatchFolders) {
    Get-ChildItem -LiteralPath $Folder -Filter "patrick-urgency-report-*.html" -ErrorAction SilentlyContinue
  }

  $Reports = $Reports |
    Sort-Object LastWriteTimeUtc

  foreach ($Report in $Reports) {
    $AlreadyHandled = $KnownFiles.ContainsKey($Report.FullName) -and
      $KnownFiles[$Report.FullName] -eq $Report.LastWriteTimeUtc

    if ($AlreadyHandled) {
      continue
    }

    $KnownFiles[$Report.FullName] = $Report.LastWriteTimeUtc

    try {
      $ReportToSend = $Report.FullName
      if ($Report.DirectoryName -ne $ScriptFolder) {
        $Destination = Join-Path $ScriptFolder $Report.Name
        Copy-Item -LiteralPath $Report.FullName -Destination $Destination -Force
        $ReportToSend = $Destination
        Write-Host "Copied report into Email folder: $($Report.Name)"
      }

      Write-Host "Processing report: $($Report.Name)"
      if ($Send) {
        & $SenderScript -ReportPath $ReportToSend -Send
      } else {
        & $SenderScript -ReportPath $ReportToSend
      }
    } catch {
      Write-Warning "Could not process $($Report.Name): $($_.Exception.Message)"
    }
  }
}
