@echo off
echo ========================================
echo CivicLens GitHub Release Cleanup Script
echo ========================================
echo.

echo Cleaning backend debug files...
cd civiclens-backend
del /Q debug_*.py 2>nul
del /Q test_*.py 2>nul
del /Q fix_*.py 2>nul
del /Q cleanup_*.py 2>nul
del /Q verify_*.py 2>nul
del /Q unlock_*.py 2>nul
del /Q reset_*.py 2>nul
del /Q mark_*.py 2>nul
del /Q run_*.py 2>nul
del /Q check_*.py 2>nul
del /Q create_admin_direct.py 2>nul
del /Q create_super_admin.py 2>nul
del /Q connectivity_test.ps1 2>nul
del /Q seed_rmc.bat 2>nul
del /Q install_security.py 2>nul
del /Q init_db.py 2>nul
rmdir /S /Q "for setting up" 2>nul
cd ..

echo Cleaning Python cache...
for /d /r civiclens-backend %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"
for /d /r civiclens-backend %%d in (.pytest_cache) do @if exist "%%d" rd /s /q "%%d"

echo Cleaning Node modules (will be reinstalled)...
rmdir /S /Q civiclens-admin\node_modules 2>nul
rmdir /S /Q civiclens-admin\.next 2>nul
rmdir /S /Q civiclens-client\node_modules 2>nul
rmdir /S /Q civiclens-client\dist 2>nul

echo Cleaning temporary files...
rmdir /S /Q .kiro 2>nul
del /Q commands 2>nul

echo Cleaning media files (optional - comment out if you want to keep)...
REM rmdir /S /Q civiclens-backend\media 2>nul

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Review the changes
echo 2. Run: git status
echo 3. Run: git add .
echo 4. Run: git commit -m "Initial release v1.0.0"
echo 5. Run: git push origin main
echo.
echo See GITHUB_RELEASE_SUMMARY.md for detailed instructions
echo.
pause
