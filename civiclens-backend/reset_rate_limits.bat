@echo off
REM Rate Limit Management Script for Windows
REM ==========================================

cd /d "%~dp0"

REM Activate virtual environment
call ..\..venv\Scripts\activate.bat

echo.
echo ================================
echo Rate Limit Management Tool
echo ================================
echo.

:menu
echo Choose an option:
echo.
echo 1. Check current rate limits
echo 2. Reset ALL rate limits
echo 3. Reset rate limits for specific phone
echo 4. Run functionality tests
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto check
if "%choice%"=="2" goto reset_all
if "%choice%"=="3" goto reset_phone
if "%choice%"=="4" goto test
if "%choice%"=="5" goto end
goto menu

:check
echo.
python scripts/reset_rate_limits.py --check
echo.
pause
goto menu

:reset_all
echo.
python scripts/reset_rate_limits.py --all
echo.
pause
goto menu

:reset_phone
echo.
set /p phone="Enter phone number (e.g., +919876543210): "
python scripts/reset_rate_limits.py --phone %phone%
echo.
pause
goto menu

:test
echo.
python scripts/reset_rate_limits.py --test
echo.
pause
goto menu

:end
echo.
echo Goodbye!
deactivate
