param(
    [string]$WorkDirectory = '.dream-loop/blender-lab-workbench',
    [string]$Blender = 'C:/Users/cwood/Tools/blender-5.2.1-windows-x64/blender.exe',
    [string]$AddonDirectory = 'C:/Users/cwood/Tools/bpy-dev-blender-mcp/addon'
)
$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$workPath = [IO.Path]::GetFullPath((Join-Path $projectPath $WorkDirectory))
if (-not $workPath.StartsWith($projectPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Workbench output must be inside this project.'
}
if (Get-NetTCPConnection -LocalPort 19877 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 19877 already has a listener; reuse or inspect that owned workbench.'
}
if (-not (Test-Path -LiteralPath $Blender -PathType Leaf)) { throw 'Configured Blender is missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $AddonDirectory 'blender_mcp_addon/mcp_to_blender_server.py'))) { throw 'Pinned addon source is missing.' }
New-Item -ItemType Directory -Path $workPath -Force | Out-Null
$env:WILDKIN_PROJECT_ROOT = $projectPath
$env:WILDKIN_BLENDER_LAB_WORK = $workPath
$env:WILDKIN_BLENDER_LAB_ADDON = $AddonDirectory
$env:BLENDER_USER_CONFIG = Join-Path $workPath 'config'
$env:OMP_NUM_THREADS = '2'
$env:OPENBLAS_NUM_THREADS = '2'
$scriptPath = Join-Path $PSScriptRoot 'blender-lab-workbench.py'
$launchArgs = @('--factory-startup', '--offline-mode', '--threads', '2', '--no-window-focus', '--window-geometry', '20', '40', '1100', '760')
$sceneFile = Join-Path $workPath 'mossling-review.blend'
if (Test-Path -LiteralPath $sceneFile -PathType Leaf) { $launchArgs += ('"' + $sceneFile + '"') }
$launchArgs += @('--python', ('"' + $scriptPath + '"'))
$child = Start-Process -FilePath $Blender -ArgumentList $launchArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $workPath 'stdout.log') -RedirectStandardError (Join-Path $workPath 'stderr.log')
@{ pid=$child.Id; executable=$Blender; work=$workPath; port=19877; startedUtc=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workPath 'process.json')
Write-Output "Started isolated Blender Lab PID $($child.Id); evidence in $workPath"
