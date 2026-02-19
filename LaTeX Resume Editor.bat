@echo off
REM ============================================================
REM LaTeX Resume Editor - Quick Launcher
REM
REM Double-click this to run the app instantly in dev mode.
REM For the full desktop app experience, run setup-desktop.bat
REM first to create the proper installer.
REM ============================================================

cd /d "%~dp0"

echo.
echo  Starting LaTeX Resume Editor...
echo.

REM Check if the installed Electron app exists
if exist "desktop\node_modules\.bin\electron.cmd" (
    REM Activate Python venv
    if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
    cd desktop
    call npx electron .
    exit /b 0
)

REM Fall back to running as a web app
echo  [!] Electron not set up. Running as web app instead.
echo  [!] Run setup-desktop.bat first for the full desktop experience.
echo.

if not exist "venv" (
    echo  Creating Python environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r code\config\requirements.txt --quiet 2>nul

echo  Starting server...
echo  Open http://localhost:5000 in your browser
echo.
python code\backend\app.py
