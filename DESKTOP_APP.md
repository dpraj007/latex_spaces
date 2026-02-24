# Desktop App Guide

Windows desktop app for LaTeX Resume Editor using Electron + Flask.

## Supported Targets

- Windows ARM64 (primary)
- Windows x64 (secondary)

## Prerequisites

- Python 3.10+
- Node.js 18+
- MiKTeX or TeX Live

## Build and Run

### One-click

Run `setup-desktop.bat` from repo root.

### Manual dev mode

```bash
python -m venv venv
venv\Scripts\activate
pip install -r code/config/requirements.txt

cd desktop
npm ci
npm start
```

### Build installer

```bash
cd desktop
npm run build:win-arm64
npm run build:win-x64
```

## Runtime Notes

- Electron starts Flask as a child process.
- Backend listens on a free localhost port.
- On app exit, Electron terminates backend process.

## Troubleshooting

- `Python not found`: install Python and reopen terminal.
- `Node.js not found`: install Node.js and reopen terminal.
- `LaTeX compiler not found`: install MiKTeX/TeX Live.
- Blank window: check logs in `%APPDATA%\latex-resume-editor\logs\`.
