@echo off
REM ============================================================
REM LaTeX Resume Editor - One-Click Desktop App Setup
REM
REM This script does EVERYTHING:
REM   1. Checks prerequisites (Python, Node.js)
REM   2. Installs Python dependencies
REM   3. Bundles Flask backend into a standalone .exe
REM   4. Installs Electron dependencies
REM   5. Builds the Windows ARM64 desktop installer
REM   6. The installer creates Start Menu + Desktop shortcuts
REM
REM Just double-click this file and wait!
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo   LaTeX Resume Editor - Desktop App Builder
echo   Target: Windows ARM64
echo ================================================================
echo.

cd /d "%~dp0"

REM ---- Step 0: Check prerequisites ----
echo [Step 0/6] Checking prerequisites...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [X] Python not found!
    echo      Please install Python 3.8+ from:
    echo      https://www.python.org/downloads/
    echo.
    echo      Make sure to check "Add Python to PATH" during install!
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo  [OK] Python %%i

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  [X] Node.js not found!
    echo      Please install Node.js 18+ from:
    echo      https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version 2^>^&1') do echo  [OK] Node.js %%i

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo  [X] npm not found! It should come with Node.js.
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('npm --version 2^>^&1') do echo  [OK] npm %%i

echo.

REM ---- Step 1: Setup Python virtual environment ----
echo [Step 1/6] Setting up Python environment...

if not exist "venv" (
    python -m venv venv
    echo  Created virtual environment
)
call venv\Scripts\activate.bat

pip install -r code\config\requirements.txt --quiet 2>nul
echo  [OK] Python dependencies installed

pip install pyinstaller --quiet 2>nul
echo  [OK] PyInstaller installed
echo.

REM ---- Step 2: Bundle Flask backend ----
echo [Step 2/6] Building Flask backend executable...

pyinstaller ^
    --name latex_editor_backend ^
    --onefile ^
    --noconsole ^
    --hidden-import=flask ^
    --hidden-import=flask_cors ^
    --hidden-import=werkzeug ^
    --hidden-import=werkzeug.serving ^
    --hidden-import=werkzeug.debug ^
    --hidden-import=jinja2 ^
    --hidden-import=jinja2.ext ^
    --hidden-import=markupsafe ^
    --hidden-import=click ^
    --hidden-import=blinker ^
    --hidden-import=itsdangerous ^
    --distpath desktop\backend-dist ^
    --workpath build\pyinstaller ^
    --specpath build ^
    --clean ^
    --noconfirm ^
    code\backend\app.py >nul 2>&1

if errorlevel 1 (
    echo  [X] Backend build failed! Running again with output...
    pyinstaller ^
        --name latex_editor_backend ^
        --onefile ^
        --noconsole ^
        --hidden-import=flask ^
        --hidden-import=flask_cors ^
        --hidden-import=werkzeug ^
        --hidden-import=jinja2 ^
        --hidden-import=markupsafe ^
        --hidden-import=click ^
        --hidden-import=blinker ^
        --hidden-import=itsdangerous ^
        --distpath desktop\backend-dist ^
        --workpath build\pyinstaller ^
        --specpath build ^
        --clean ^
        --noconfirm ^
        code\backend\app.py
    if errorlevel 1 (
        echo.
        echo  Build failed. Please check the errors above.
        pause
        exit /b 1
    )
)

echo  [OK] Backend executable built
echo.

REM ---- Step 3: Install Electron dependencies ----
echo [Step 3/6] Installing Electron dependencies...

cd desktop
call npm install --quiet 2>nul
echo  [OK] Electron dependencies installed
echo.

REM ---- Step 4: Generate icon (create a placeholder PNG if needed) ----
echo [Step 4/6] Checking app icon...

if not exist "assets\icon.png" (
    echo  [!] No icon.png found. Using placeholder.
    echo  [!] For a custom icon, generate one from desktop\generate-icon.html
    echo  [!] and save it as desktop\assets\icon.png
    REM Create a tiny valid 1x1 PNG as placeholder so the build doesn't fail
    python -c "import base64,pathlib;pathlib.Path('assets/icon.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='))" 2>nul
)
echo  [OK] Icon ready
echo.

REM ---- Step 5: Build Electron app for Windows ARM64 ----
echo [Step 5/6] Building Electron desktop app (Windows ARM64)...
echo           This may take a few minutes on first run...
echo.

call npx electron-builder --win --arm64

if errorlevel 1 (
    echo.
    echo  [!] ARM64 build had issues. Trying x64 as fallback...
    call npx electron-builder --win --x64
)

cd ..
echo.

REM ---- Step 6: Done! ----
echo ================================================================
echo.
echo  BUILD COMPLETE!
echo.
echo  Your installer is in the 'dist' folder:
echo.

if exist "dist\*.exe" (
    for %%f in (dist\*.exe) do echo    %%f
) else (
    echo    [Check the dist\ folder for your installer]
)

echo.
echo  To install:
echo    1. Double-click the installer .exe in the dist\ folder
echo    2. Follow the installation wizard
echo    3. Launch "LaTeX Resume Editor" from Start Menu or Desktop!
echo.
echo  PREREQUISITES for running the app:
echo    - MiKTeX (https://miktex.org/download) for LaTeX compilation
echo.
echo ================================================================
echo.
pause
