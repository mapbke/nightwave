@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo NIGHTWAVE v0.5 - React + Electron backend
echo ==========================================
echo.

call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

call npm run build:win
if errorlevel 1 goto :fail

echo.
echo DONE: release\Nightwave-v0.5.exe
pause
exit /b 0

:fail
echo.
echo BUILD FAILED
pause
exit /b 1
