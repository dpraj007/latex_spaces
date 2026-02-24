# Contributing

## Prerequisites

- Python 3.10+
- Node.js 18+
- A LaTeX compiler (`pdflatex`, `xelatex`, or `lualatex`)

## Local Setup

1. Create and activate a virtual environment.
2. Install runtime and dev dependencies:
```bash
pip install -r code/config/requirements.txt -r code/config/requirements-dev.txt
```
3. Install desktop dependencies:
```bash
cd desktop
npm ci
```

## Run Locally

- Web app:
```bash
python code/backend/app.py
```
- Desktop app:
```bash
cd desktop
npm start
```

## Tests

```bash
pytest -q code/backend/tests
```

## Pull Requests

- Keep PRs focused and small.
- Add or update tests for behavior changes.
- Update docs when setup/build behavior changes.
- Ensure CI is green before requesting review.
