param(
  [ValidateSet('Start', 'Status', 'Stop')][string]$Action = 'Status',
  [string]$InstallRoot = 'C:/Users/cwood/Tools/trellis2-stableprojectorz/code'
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runDirectory = Join-Path $projectRoot '.dream-loop/local-trellis'
$receiptPath = Join-Path $runDirectory 'server.json'
$pythonPath = Join-Path $InstallRoot 'venv/Scripts/python.exe'
$apiPath = Join-Path $InstallRoot 'api_spz/main_api.py'
$endpoint = 'http://127.0.0.1:7960'

function Read-LocalStatus {
  try {
    $ping = Invoke-RestMethod -Uri "$endpoint/ping" -TimeoutSec 3
    $state = Invoke-RestMethod -Uri "$endpoint/status" -TimeoutSec 3
    return @{ ready = $true; endpoint = $endpoint; ping = $ping; status = $state }
  } catch {
    return @{ ready = $false; endpoint = $endpoint; detail = 'API is absent or still loading; inspect its logs before launching another process.' }
  }
}

if ($Action -eq 'Status') {
  Read-LocalStatus | ConvertTo-Json -Depth 8
  exit 0
}

if ($Action -eq 'Stop') {
  if (!(Test-Path -LiteralPath $receiptPath)) { throw 'No process receipt from this helper; refusing to stop an unowned service.' }
  $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
  $running = Get-CimInstance Win32_Process -Filter "ProcessId=$($receipt.processId)"
  if ($running) {
    if (!$running.CommandLine.Contains($receipt.apiPath) -or !$running.CommandLine.Contains('--port 7960')) {
      throw 'Process identity no longer matches the recorded local TRELLIS launch.'
    }
    Stop-Process -Id $receipt.processId
  }
  @{ stopped = $true; processId = $receipt.processId; endpoint = $endpoint } | ConvertTo-Json
  exit 0
}

$existing = Read-LocalStatus
if ($existing.ready) { $existing | ConvertTo-Json -Depth 8; exit 0 }
if (Test-Path -LiteralPath $receiptPath) {
  $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
  $recordedProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($receipt.processId)"
  if ($recordedProcess -and $recordedProcess.CommandLine.Contains($receipt.apiPath)) {
    @{ ready = $false; processId = $receipt.processId; detail = 'Recorded process is still loading; inspect logs instead of starting a duplicate.' } | ConvertTo-Json
    exit 0
  }
}
foreach ($required in @($pythonPath, $apiPath, (Join-Path $InstallRoot 'models'))) {
  if (!(Test-Path -LiteralPath $required)) { throw "Required installed TRELLIS path missing: $required" }
}
if (Get-NetTCPConnection -LocalPort 7960 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 7960 already has a listener; inspect it before starting another server.'
}
New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
$env:PYTHONNOUSERSITE = '1'
$env:PYTHONUNBUFFERED = '1'
$env:SETUPTOOLS_USE_DISTUTILS = 'stdlib'
$env:HF_HOME = Join-Path $InstallRoot 'models'
$env:HF_HUB_DISABLE_IMPLICIT_TOKEN = '1'
$env:HF_HUB_OFFLINE = '1'
$env:TRANSFORMERS_OFFLINE = '1'
$env:HF_HUB_DISABLE_TELEMETRY = '1'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $runDirectory "$stamp.stdout.log"
$stderr = Join-Path $runDirectory "$stamp.stderr.log"
$arguments = '-u "' + $apiPath + '" --host 127.0.0.1 --port 7960'
$process = Start-Process -FilePath $pythonPath -ArgumentList $arguments -WorkingDirectory $InstallRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$result = @{ processId = $process.Id; pythonPath = $pythonPath; apiPath = $apiPath; endpoint = $endpoint; startedUtc = [DateTime]::UtcNow.ToString('o'); stdout = $stdout; stderr = $stderr }
$result | ConvertTo-Json | Set-Content -LiteralPath $receiptPath -Encoding utf8
$result | ConvertTo-Json
