@echo off
REM Setup AI Engine User and Test Pipeline
REM This script sets up the AI Engine system user and tests the complete pipeline

echo.
echo ============================================================
echo    AI ENGINE SETUP - CIVICLENS
echo ============================================================
echo.

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo ============================================================
echo STEP 1: Creating AI Engine System User
echo ============================================================
echo.
python -m app.db.seeds.create_ai_system_user

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to create AI Engine user
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo ============================================================
echo STEP 2: Testing AI Pipeline with Audit Trail
echo ============================================================
echo.
python test_ai_pipeline_with_audit.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Pipeline test failed
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS! AI Engine is ready for production
echo ============================================================
echo.
echo Next steps:
echo   1. Restart the AI worker: python -m app.workers.ai_worker
echo   2. Process reports and check audit trails
echo   3. Verify "AI Engine" appears in the frontend
echo.
echo Press any key to exit...
pause > nul
