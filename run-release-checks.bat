@echo off
setlocal
cd /d "%~dp0"
set "REPORT=LIVE_TEST_RESULTS.txt"
echo.
echo ===================================================
echo   PUB QUIZ POWERHOUSE v3.3 ALPHA 7
echo   LOCAL NETWORK / RELEASE TESTS
echo ===================================================
echo.
(
 echo PUB QUIZ POWERHOUSE v3.3 Alpha 7 - Local Network Test Report
 echo This checks localhost Socket.io, not real phones or Render.
 echo.
 echo COMPUTER: %COMPUTERNAME%
 echo DATE: %DATE% %TIME%
 echo.
) > "%REPORT%"
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Node.js is missing. Install Node.js LTS.
 echo ERROR: Node.js not found. >> "%REPORT%"
 goto failed
)
where npm >nul 2>nul
if errorlevel 1 (
 echo ERROR: npm is missing. Repair your Node.js installation.
 echo ERROR: npm not found. >> "%REPORT%"
 goto failed
)
node --version >> "%REPORT%" 2>&1
call npm --version >> "%REPORT%" 2>&1
if not exist "node_modules\express\package.json" goto install
if not exist "node_modules\socket.io\package.json" goto install
if not exist "node_modules\socket.io-client\package.json" goto install
goto test
:install
echo Installing test dependencies. Internet is required on first run...
echo Installing dependencies... >> "%REPORT%"
call npm ci --no-audit --no-fund >> "%REPORT%" 2>&1
if errorlevel 1 (
 echo Dependency installation failed. Details saved in %REPORT%.
 goto failed
)
:test
echo Running tests... Please keep this window open.
echo. >> "%REPORT%"
echo ==== FULL TEST SUITE ==== >> "%REPORT%"
call npm test >> "%REPORT%" 2>&1
if errorlevel 1 (
 echo Some tests failed. Details saved in %REPORT%.
 goto failed
)
echo. >> "%REPORT%"
echo ALL TESTS PASSED (LOCAL). >> "%REPORT%"
echo.
echo ALL LOCAL TESTS PASSED.
echo This does NOT certify real phones, TV pairing, or Render.
echo Report saved: %REPORT%
pause
exit /b 0
:failed
echo. >> "%REPORT%"
echo LOCAL TESTS INCOMPLETE OR FAILED. >> "%REPORT%"
echo.
echo DO NOT deploy this alpha to the live Render service.
echo Please upload LIVE_TEST_RESULTS.txt to ChatGPT for diagnosis.
echo If the package installation failed, the report shows why.
pause
exit /b 1
