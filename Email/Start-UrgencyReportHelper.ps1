param(
  [int]$Port = 8767
)

$ErrorActionPreference = "Stop"

$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunnerScript = Join-Path $ScriptFolder "Invoke-DailyUrgencyReport.ps1"
$PatrickChangeRunnerScript = Join-Path $ScriptFolder "Invoke-PatrickChangeReport.ps1"

if (-not (Test-Path -LiteralPath $RunnerScript)) {
  throw "Missing report runner script: $RunnerScript"
}
if (-not (Test-Path -LiteralPath $PatrickChangeRunnerScript)) {
  throw "Missing Patrick change report runner script: $PatrickChangeRunnerScript"
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
