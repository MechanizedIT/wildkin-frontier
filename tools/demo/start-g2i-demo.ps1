[CmdletBinding()]
param([switch]$NoBrowser, [ValidateSet('g2i', 'scout', 'ordinary')][string]$Mode = 'g2i')

$ErrorActionPreference = 'Stop'
$demoRepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$demoUrl = switch ($Mode) { 'scout' { 'http://127.0.0.1:8080/?scout=1' } 'ordinary' { 'http://127.0.0.1:8080/' } default { 'http://127.0.0.1:8080/?g2i=1' } }
$demoServer = $null

function Test-WildkinServer {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>Wildkin Frontier'
    } catch { return $false }
}

try {
    if (Test-WildkinServer) {
        Write-Host 'Using the existing Wildkin server on port 8080. Stop it in its original terminal with Ctrl+C.'
    } else {
        Get-Command npm.cmd -ErrorAction Stop | Out-Null
        $demoLogRoot = Join-Path $demoRepoRoot 'native/unity/WildkinUnity/Library/WildkinG2IDemo'
        New-Item -ItemType Directory -Path $demoLogRoot -Force | Out-Null
        # Existing repository command, fixed child command, owned process tree, no Unity-spawned server.
        $demoServer = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-Command', 'npm.cmd run dev') -WorkingDirectory $demoRepoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $demoLogRoot 'browser.stdout.log') -RedirectStandardError (Join-Path $demoLogRoot 'browser.stderr.log')
        $demoDeadline = [DateTime]::UtcNow.AddSeconds(30)
        while (-not (Test-WildkinServer)) {
            $demoServer.Refresh()
            if ($demoServer.HasExited -or [DateTime]::UtcNow -gt $demoDeadline) {
                throw "Wildkin did not start on port 8080. Check $demoLogRoot/browser.stderr.log; another app may own the port."
            }
            Start-Sleep -Milliseconds 300
        }
        Write-Host "Wildkin server ready. Owned launcher PID: $($demoServer.Id)."
        Write-Host 'Keep this terminal open. Press Ctrl+C here to stop the server and its child processes.'
        Write-Host "Fallback stop from another terminal: taskkill /PID $($demoServer.Id) /T /F"
    }
    if (-not $NoBrowser) { Start-Process $demoUrl }
    Write-Host "Browser demo: $demoUrl"
    if ($null -ne $demoServer) {
        while (-not $demoServer.HasExited) { Start-Sleep -Seconds 1; $demoServer.Refresh() }
    }
} finally {
    if ($null -ne $demoServer) {
        $demoServer.Refresh()
        if (-not $demoServer.HasExited) { & taskkill.exe /PID $demoServer.Id /T /F | Out-Null }
        Write-Host 'The demo-owned server has stopped.'
    }
}
