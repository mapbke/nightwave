@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo [Nightwave] Installing dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
if exist release rmdir /s /q release
call npm run build
if errorlevel 1 pause & exit /b 1
echo.
echo READY: release\Nightwave.exe
pause
