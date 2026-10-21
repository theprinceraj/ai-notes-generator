# Registers a Windows scheduled task that runs `notes run` every 15 minutes from 08:00 to 11:30.
# Run it once from PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\schedule-windows.ps1
# Remove it with:               Unregister-ScheduledTask -TaskName "AI Notes Generator" -Confirm:$false

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $root 'src\cli.js'

# Use bun.exe itself: the npm-installed `bun` command is a .cmd wrapper that adds seconds per start.
$candidates = @(
  $(if ($env:BUN_INSTALL) { Join-Path $env:BUN_INSTALL 'bin\bun.exe' }),
  (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'),
  (Join-Path $env:APPDATA 'npm\node_modules\bun\bin\bun.exe')
) | Where-Object { $_ -and (Test-Path $_) }
if (-not $candidates) { throw 'bun.exe not found; install Bun from https://bun.sh' }
$bun = @($candidates)[0]

$action = New-ScheduledTaskAction -Execute $bun -Argument "`"$cli`" run" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At '08:00'
# Repeat every 15 minutes for 3.5 hours: captions get up to 3 hours before Groq takes over.
$repeat = New-ScheduledTaskTrigger -Once -At '08:00' -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 3 -Minutes 30)
$trigger.Repetition = $repeat.Repetition

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3) `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName 'AI Notes Generator' -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Makes handwritten-style notes for the daily Utkarsh Classes current affairs class.' -Force | Out-Null

Write-Output "Scheduled: '$bun' '$cli' run — daily 08:00-11:30, every 15 minutes."
