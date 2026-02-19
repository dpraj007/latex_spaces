@echo off
REM ============================================================
REM LaTeX Resume Editor - Run in Development Mode
REM
REM Runs the Electron app in dev mode (uses Python directly,
REM no need to build the backend .exe first)
REM ============================================================

cd /d "%~dp0"

echo.
echo  LaTeX Resume Editor - Development Mode
echo  =======================================
echo.

REM Activate Python venv if it exists
if exist "..\venv\Scripts\activate.bat" (
    call ..\venv\Scripts\activate.bat
    echo  [OK] Python venv activated
) else (
    echo  [!] No venv found. Creating one...
    cd ..
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r code\config\requirements.txt --quiet
    cd desktop
    echo  [OK] Python venv created and dependencies installed
)

REM Install Electron if needed
if not exist "node_modules" (
    echo  [!] Installing Electron dependencies...
    call npm install
)

echo  [OK] Starting Electron app...
echo.

call npx electron .

echo.
echo  App closed.
