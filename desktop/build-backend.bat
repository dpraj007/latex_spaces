@echo off
REM ============================================================
REM LaTeX Resume Editor - Build Python Backend with PyInstaller
REM Creates a standalone .exe from the Flask backend
REM ============================================================

echo.
echo ============================================================
echo  Building Flask Backend with PyInstaller
echo ============================================================
echo.

cd /d "%~dp0.."

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.8+
    echo         https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Create/activate virtual environment
if not exist "venv" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
)

echo [1/4] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo [2/4] Installing Python dependencies...
pip install -r code\config\requirements.txt --quiet
pip install pyinstaller --quiet

REM Build the backend executable
echo [3/4] Building backend executable with PyInstaller...
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
    code\backend\app.py

if errorlevel 1 (
    echo [ERROR] PyInstaller build failed!
    pause
    exit /b 1
)

echo [4/4] Cleaning up...
if exist "build\pyinstaller" rmdir /s /q "build\pyinstaller"

echo.
echo ============================================================
echo  Backend build complete!
echo  Output: desktop\backend-dist\latex_editor_backend.exe
echo ============================================================
echo.
