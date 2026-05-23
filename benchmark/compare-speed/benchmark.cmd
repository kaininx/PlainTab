@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%_tool\benchmark.ps1"

echo.
echo Benchmark closed.
pause
