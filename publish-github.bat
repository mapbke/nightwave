@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo NIGHTWAVE v0.4.2 - build + public GitHub + EXE release
echo ======================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js 22 LTS and run this file again.
  pause
  exit /b 1
)

where gh >nul 2>nul
if errorlevel 1 (
  echo [INFO] GitHub CLI not found. Trying winget install...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Install GitHub CLI from https://cli.github.com/ and run again.
    pause
    exit /b 1
  )
  winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo [ERROR] GitHub CLI installation failed.
    pause
    exit /b 1
  )
  set "PATH=%PATH%;C:\Program Files\GitHub CLI"
)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo [INFO] Sign in to GitHub in the browser window that opens.
  gh auth login --web --git-protocol https
  if errorlevel 1 (
    echo [ERROR] GitHub authentication failed.
    pause
    exit /b 1
  )
)

echo.
echo [1/5] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo.
echo [2/5] Building portable Nightwave.exe...
call npm run build:win
if errorlevel 1 goto :fail
if not exist "release\Nightwave.exe" (
  echo [ERROR] release\Nightwave.exe was not created.
  goto :fail
)

echo.
echo [3/5] Preparing git repository...
if not exist .git (
  git init
  git branch -M main
)
git add .
git diff --cached --quiet
if errorlevel 1 git commit -m "Nightwave v0.4.2 - fix SoundCloud OAuth popups"

for /f "delims=" %%U in ('gh api user --jq .login') do set "GHUSER=%%U"
set "REPO=nightwave"

echo.
echo [4/5] Publishing https://github.com/%GHUSER%/%REPO% ...
gh repo view "%GHUSER%/%REPO%" >nul 2>nul
if errorlevel 1 (
  gh repo create "%REPO%" --public --source=. --remote=origin --push --description "Nightwave - monochrome SoundCloud desktop client"
  if errorlevel 1 goto :fail
) else (
  git remote get-url origin >nul 2>nul
  if errorlevel 1 git remote add origin "https://github.com/%GHUSER%/%REPO%.git"
  git push -u origin main
  if errorlevel 1 goto :fail
)

echo.
echo [5/5] Creating GitHub Release v0.4.2 with Nightwave.exe...
gh release view v0.4.2 --repo "%GHUSER%/%REPO%" >nul 2>nul
if not errorlevel 1 gh release delete v0.4.2 --repo "%GHUSER%/%REPO%" --yes --cleanup-tag

git tag -f v0.4.2
git push origin v0.4.2 --force
if errorlevel 1 goto :fail

gh release create v0.4.2 "release\Nightwave.exe#Nightwave.exe" --repo "%GHUSER%/%REPO%" --title "Nightwave v0.4.2" --notes-file RELEASE_NOTES.md
if errorlevel 1 goto :fail

echo.
echo ======================================================
echo DONE
 echo Repo:    https://github.com/%GHUSER%/%REPO%
echo Release: https://github.com/%GHUSER%/%REPO%/releases/tag/v0.4.2
echo EXE:     release\Nightwave.exe
echo ======================================================
start "" "https://github.com/%GHUSER%/%REPO%/releases/tag/v0.4.2"
pause
exit /b 0

:fail
echo.
echo [ERROR] Publishing stopped. Read the error above.
pause
exit /b 1
