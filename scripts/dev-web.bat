@echo off
setlocal

cd /d "%~dp0\.."

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r code\config\requirements.txt -r code\config\requirements-dev.txt

python code\backend\app.py
