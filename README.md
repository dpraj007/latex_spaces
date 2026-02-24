# LaTeX Resume Editor

Open-source LaTeX resume editor with:

- Web app mode (Flask + static frontend)
- Windows desktop mode (Electron + bundled Flask backend)

## Requirements

- Python 3.10+
- Node.js 18+ (desktop mode)
- A LaTeX compiler (`pdflatex`, `xelatex`, or `lualatex`)
  - Windows: MiKTeX or TeX Live
  - macOS: MacTeX
  - Linux: TeX Live

## Quick Start (Web App)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r code/config/requirements.txt -r code/config/requirements-dev.txt
python code/backend/app.py
```

Open `http://127.0.0.1:5000`.

## Quick Start (Windows Desktop App)

### One-click setup

Run `setup-desktop.bat` from the repo root.

### Manual setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r code/config/requirements.txt

cd desktop
npm ci
npm start
```

### Build installers

```bash
cd desktop
npm run build:win-arm64
npm run build:win-x64
```

## Environment Validation

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-env.ps1
```

## Repository Layout

```text
code/
  backend/
  frontend/
  config/
desktop/
latex/
  templates/
  resumes/
  cover_letters/
scripts/
.github/
```

## Development

- Run backend tests:
```bash
pytest -q code/backend/tests
```
- Contributor guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Release process: `RELEASE_CHECKLIST.md`

## License

MIT. See `LICENSE`.
