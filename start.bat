@echo off
title Pub Quiz Powerhouse v3.3 Alpha 4 - keep this window open
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)
if not exist "node_modules\express\package.json" (
  echo.
  echo Installing the game server software. Internet is required for the first run.
  where npm >nul 2>nul
  if errorlevel 1 (echo npm is missing. Reinstall Node.js.& pause& exit /b 1)
  call npm install
  if errorlevel 1 (echo Install failed. Check your connection, then run start.bat again.& pause& exit /b 1)
)
echo.
echo Starting Pub Quiz Powerhouse v3.3 Alpha 4...
node server.js
if errorlevel 1 echo Server stopped due to an error; read the message above.
pause
