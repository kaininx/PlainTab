@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%open-benchmark.ps1"

echo.
echo Benchmark server stopped.
pause
