$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..\..')

function Get-PythonCommand {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{
            File = 'py'
            Args = @('-3')
        }
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{
            File = 'python'
            Args = @()
        }
    }

    throw 'Python was not found. Install Python or add py/python to PATH.'
}

function Test-PortAvailable {
    param([int]$Port)

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

function Get-FreePort {
    foreach ($port in 8014..8030) {
        if (Test-PortAvailable -Port $port) {
            return $port
        }
    }

    throw 'No free local benchmark port found in 8014-8030.'
}

$python = Get-PythonCommand
$port = Get-FreePort
$url = "http://127.0.0.1:$port/benchmark/compare-speed/_tool/benchmark.html"
$serverScript = Join-Path $scriptDir 'benchmark-server.py'
$browserProfile = Join-Path ([System.IO.Path]::GetTempPath()) ('plaintab-benchmark-profile-' + [guid]::NewGuid().ToString('N'))

Set-Location $repoRoot

function Get-BenchmarkBrowser {
    $candidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Open-BenchmarkUrl {
    param([string]$BenchmarkUrl)

    $browser = Get-BenchmarkBrowser
    if ($browser) {
        New-Item -ItemType Directory -Force -Path $browserProfile | Out-Null
        Start-Process -FilePath $browser -ArgumentList @(
            '--new-window',
            '--disable-extensions',
            '--no-first-run',
            '--no-default-browser-check',
            "--user-data-dir=$browserProfile",
            $BenchmarkUrl
        )
        Write-Host 'Opened in a clean temporary browser profile with extensions disabled.'
        return
    }

    Start-Process $BenchmarkUrl
    Write-Host 'Opened in the default browser. For cleaner results, disable browser extensions manually.'
}

Write-Host ''
Write-Host 'PlainTab benchmark server'
Write-Host "Root: $repoRoot"
Write-Host "URL:  $url"
Write-Host ''
Write-Host 'A browser window will open now. Keep this terminal open while benchmarking.'
Write-Host 'Press Ctrl+C here to stop the HTTP server.'
Write-Host ''

Open-BenchmarkUrl -BenchmarkUrl $url

$serverArgs = @()
$serverArgs += $python.Args
$serverArgs += @($serverScript, '--port', [string]$port, '--bind', '127.0.0.1', '--root', [string]$repoRoot)

try {
    & $python.File @serverArgs
} finally {
    if (Test-Path $browserProfile) {
        try { Remove-Item -LiteralPath $browserProfile -Recurse -Force -ErrorAction Stop } catch { }
    }
}
