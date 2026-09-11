param(
    [string]$BlenderPath = 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe'
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$proofRoot = Join-Path $projectRoot '.dream-loop/blender-workbench'
New-Item -ItemType Directory -Force -Path $proofRoot | Out-Null
$listener = Get-NetTCPConnection -LocalPort 9876 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Output 'A Blender MCP listener is already running on port 9876. Inspect its scene before making changes.'
    exit 0
}
$env:WILDKIN_PROJECT_ROOT = $projectRoot
$env:BLENDER_MCP_DISABLE_TELEMETRY = '1'
$env:PYTHONUTF8 = '1'
$bootstrap = Join-Path $PSScriptRoot 'blender-workbench.py'
$arguments = @('--python', ('"' + $bootstrap + '"'))
$process = Start-Process -FilePath $BlenderPath -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $proofRoot 'blender.log') -RedirectStandardError (Join-Path $proofRoot 'blender-error.log')
Write-Output "Started Blender workbench process $($process.Id). MCP is local on 127.0.0.1:9876; check the scene and viewport before editing."
