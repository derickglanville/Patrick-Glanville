param(
  [int]$Port = 8767
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunnerScript = Join-Path $ScriptFolder "Invoke-DailyUrgencyReport.ps1"
$PatrickChangeRunnerScript = Join-Path $ScriptFolder "Invoke-PatrickChangeReport.ps1"
$AdminBillSmsRunnerScript = Join-Path $ScriptFolder "admin_bill_due_sms_alert.py"
$EmailAutomationPath = Join-Path $ScriptFolder "email-automation.json"
$AdminBillSmsTaskName = "Admin Bill Due SMS Alert"

if (-not (Test-Path -LiteralPath $RunnerScript)) {
  throw "Missing report runner script: $RunnerScript"
}
if (-not (Test-Path -LiteralPath $PatrickChangeRunnerScript)) {
  throw "Missing Patrick change report runner script: $PatrickChangeRunnerScript"
}
if (-not (Test-Path -LiteralPath $AdminBillSmsRunnerScript)) {
  throw "Missing Admin bill SMS runner script: $AdminBillSmsRunnerScript"
}

$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add("http://127.0.0.1:$Port/")
$Listener.Start()

Write-Host "Urgency report helper listening on http://127.0.0.1:$Port/"
Write-Host "Press Ctrl+C to stop."

function Write-JsonResponse {
  param(
    [System.Net.HttpListenerResponse]$Response,
    [int]$StatusCode,
    [hashtable]$Payload
  )

  $Json = ($Payload | ConvertTo-Json -Depth 6)
  $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Json)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json"
  $Response.ContentEncoding = [System.Text.Encoding]::UTF8
  $Response.Headers["Access-Control-Allow-Origin"] = "*"
  $Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
  $Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
  $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Response.OutputStream.Close()
}

function Get-AdminBillSmsPolicy {
  if (-not (Test-Path -LiteralPath $EmailAutomationPath)) {
    throw "Missing local SMS automation settings."
  }

  $Settings = Get-Content -LiteralPath $EmailAutomationPath -Raw | ConvertFrom-Json
  if ($null -eq $Settings.adminDueDateSmsNotifier) {
    throw "Admin bill SMS settings are not configured."
  }

  return $Settings
}

function Get-AdminBillSmsPublicSettings {
  $Settings = Get-AdminBillSmsPolicy
  $Policy = $Settings.adminDueDateSmsNotifier
  $SendTime = [string]$Policy.sendTime
  if ([string]::IsNullOrWhiteSpace($SendTime)) {
    $SendTime = "18:30"
  }
  return @{
    ok = $true
    enabled = [bool]$Policy.enabled
    sendTime = $SendTime
    scheduleLabel = "Local computer time"
  }
}

function Read-RequestJson {
  param([System.Net.HttpListenerRequest]$Request)

  $Reader = [System.IO.StreamReader]::new($Request.InputStream, $Request.ContentEncoding)
  try {
    $Body = $Reader.ReadToEnd()
  } finally {
    $Reader.Close()
  }
  if ([string]::IsNullOrWhiteSpace($Body)) {
    return $null
  }
  return $Body | ConvertFrom-Json
}

function Set-AdminBillSmsSchedule {
  param([string]$SendTime)

  if ($SendTime -notmatch '^(?:[01]\d|2[0-3]):[0-5]\d$') {
    throw "The SMS run time must use 24-hour HH:mm format."
  }

  $Settings = Get-AdminBillSmsPolicy
  $Settings.adminDueDateSmsNotifier.sendTime = $SendTime
  $Settings | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $EmailAutomationPath -Encoding utf8

  $TaskOutput = & schtasks.exe /Change /TN $AdminBillSmsTaskName /ST $SendTime 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "The local SMS settings were saved, but Windows Task Scheduler could not be updated: $TaskOutput"
  }
}

try {
  while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response

    if ($Request.HttpMethod -eq "OPTIONS") {
      Write-JsonResponse -Response $Response -StatusCode 200 -Payload @{ ok = $true }
      continue
    }

    if ($Request.Url.AbsolutePath -eq "/health") {
      Write-JsonResponse -Response $Response -StatusCode 200 -Payload @{
        ok = $true
        status = "ready"
        script = $RunnerScript
      }
      continue
    }

    if ($Request.HttpMethod -eq "POST" -and $Request.Url.AbsolutePath -eq "/run-urgency-report") {
      try {
        $Output = & powershell -ExecutionPolicy Bypass -File $RunnerScript 2>&1 | Out-String
        Write-JsonResponse -Response $Response -StatusCode 200 -Payload @{
          ok = $true
          message = "Urgency report process completed."
          output = $Output.Trim()
        }
      } catch {
        Write-JsonResponse -Response $Response -StatusCode 500 -Payload @{
          ok = $false
          message = "Urgency report process failed."
          error = $_.Exception.Message
        }
      }
      continue
    }

    if ($Request.HttpMethod -eq "GET" -and $Request.Url.AbsolutePath -eq "/admin-bill-sms-config") {
      try {
        Write-JsonResponse -Response $Response -StatusCode 200 -Payload (Get-AdminBillSmsPublicSettings)
      } catch {
        Write-JsonResponse -Response $Response -StatusCode 500 -Payload @{ ok = $false; message = $_.Exception.Message }
      }
      continue
    }

    if ($Request.HttpMethod -eq "POST" -and $Request.Url.AbsolutePath -eq "/run-admin-bill-sms-manual") {
      try {
        $Output = & python $AdminBillSmsRunnerScript --send-manual 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw $Output }
        Write-JsonResponse -Response $Response -StatusCode 200 -Payload @{
          ok = $true
          message = "Admin bill text check completed."
          output = $Output.Trim()
        }
      } catch {
        Write-JsonResponse -Response $Response -StatusCode 500 -Payload @{ ok = $false; message = "Admin bill text check failed."; error = $_.Exception.Message }
      }
      continue
    }

    if ($Request.HttpMethod -eq "POST" -and $Request.Url.AbsolutePath -eq "/set-admin-bill-sms-schedule") {
      try {
        $Payload = Read-RequestJson -Request $Request
        $SendTime = [string]$Payload.sendTime
        Set-AdminBillSmsSchedule -SendTime $SendTime
        Write-JsonResponse -Response $Response -StatusCode 200 -Payload @{
          ok = $true
          sendTime = $SendTime
          message = "Admin bill text schedule updated for local computer time."
        }
      } catch {
        Write-JsonResponse -Response $Response -StatusCode 500 -Payload @{ ok = $false; message = "Admin bill text schedule was not updated."; error = $_.Exception.Message }
      }
      continue
    }

    if ($Request.HttpMethod -eq "POST" -and $Request.Url.AbsolutePath -eq "/run-patrick-change-report") {
      try {
        $Output = & powershell -ExecutionPolicy Bypass -File $PatrickChangeRunnerScript -GenerateOnly 2>&1 | Out-String
        Write-JsonResponse -Response $Response -StatusCode 200 -Payload @{
          ok = $true
          message = "Patrick change report process completed."
          output = $Output.Trim()
        }
      } catch {
        Write-JsonResponse -Response $Response -StatusCode 500 -Payload @{
          ok = $false
          message = "Patrick change report process failed."
          error = $_.Exception.Message
        }
      }
      continue
    }

    Write-JsonResponse -Response $Response -StatusCode 404 -Payload @{
      ok = $false
      message = "Endpoint not found."
      path = $Request.Url.AbsolutePath
    }
  }
} finally {
  if ($Listener.IsListening) {
    $Listener.Stop()
  }
  $Listener.Close()
}
