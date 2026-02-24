# Open Source Master Plan

This plan is for publishing this repo as a stable open-source project that others can build and run on their own PCs.

## 1) Goals and Success Criteria

- Public users can run the web app locally in under 15 minutes.
- Public users can build the desktop app on Windows ARM64 and Windows x64.
- Build and run instructions are deterministic and tested in CI.
- Repository contains only source and required sample assets, not local machine artifacts.

## 2) Current Release Blockers (Observed)

- No root `LICENSE` file (even though `desktop/package.json` says MIT).
- `package-lock.json` is ignored, which hurts reproducible npm installs.
- `latex/` is ignored globally; this can hide required templates/sample data from new users.
- Repo contains local build/runtime folders (`venv/`, `build/`, `dist/`, `output/`) that should not be part of open-source onboarding.
- Existing docs are good for Windows, but contributor standards and release workflow are missing.

## 3) Phase Plan

## Phase 0: Repo Hygiene (Day 0-1)

- Add root `LICENSE` (MIT or chosen license).
- Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
- Refactor `.gitignore`:
  - Keep generated artifacts ignored (`venv`, `dist`, `build`, `output`, `desktop/node_modules`).
  - Stop ignoring lockfiles needed for reproducibility (`package-lock.json` should be committed for `desktop/`).
  - Replace broad `latex/` ignore with targeted rules so required templates/samples are versioned.
- Create clean sample content:
  - `latex/templates/*.tex` (at least 2 starter templates).
  - `latex/resumes/sample_resume.tex`.
  - Never commit personal/private resume files.
- Define required toolchain versions in docs:
  - Python, Node.js, npm, LaTeX distribution.

Exit criteria:
- Fresh clone on another machine has all source/templates needed to run.
- No personal data or machine-specific artifacts in repo.

## Phase 1: Standardized Build UX (Day 1-3)

- Keep `setup-desktop.bat` as the one-click Windows path.
- Add script parity for developer flows:
  - `scripts/dev-web` (start Flask web mode).
  - `desktop` scripts for build targets (`win-arm64`, `win-x64`) already exist; ensure docs match exactly.
- Add environment validation command:
  - Checks Python, Node, npm, and LaTeX compiler availability.
- Add clear output expectations:
  - Where installer lands.
  - Where logs are stored.
  - How to troubleshoot common failures.

Exit criteria:
- A new user can follow docs and run web mode and desktop mode without manual debugging.

## Phase 2: CI and Quality Gates (Day 3-5)

- Add GitHub Actions workflows:
  - `ci.yml`: lint + smoke tests for backend; frontend static checks.
  - `desktop-build.yml`: build smoke check for Windows target(s).
- Add minimum tests:
  - Backend API health route and compile endpoint behavior (mock compiler if needed).
  - File/path safety tests for filename sanitization.
- Add pre-merge checks:
  - PR template with checklist for docs/tests.
  - Required CI checks before merge.

Exit criteria:
- Every PR validates core functionality automatically.
- Main branch is always buildable.

## Phase 3: Release and Distribution (Day 5-7)

- Adopt semantic versioning (`v1.0.0`, `v1.1.0`, etc.).
- Add release checklist:
  - Update changelog.
  - Tag release.
  - Build installer artifacts.
  - Publish GitHub Release with checksums and install notes.
- Add issue templates:
  - Bug report.
  - Feature request.
  - Build/install problem report.

Exit criteria:
- Users can download a release artifact and install with clear instructions.

## 4) Recommended Repository Layout (Target)

- `README.md` (quick start + platform matrix)
- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `.github/workflows/*.yml`
- `code/` (backend/frontend source)
- `desktop/` (Electron app + committed lockfile)
- `latex/templates/` (open-source sample templates only)
- `scripts/` (setup/validation helpers)

## 5) Build Matrix to Support

- Web mode:
  - Windows, macOS, Linux with Python + LaTeX.
- Desktop mode:
  - Windows ARM64 (primary).
  - Windows x64 (secondary fallback).

Optional later:
- macOS/Linux desktop packaging.

## 6) First PR Sequence (Concrete)

1. PR-1 Repo governance and licensing files.
2. PR-2 `.gitignore` cleanup + sample `latex/templates` and sample resume.
3. PR-3 README rewrite for clean clone onboarding + deterministic install steps.
4. PR-4 CI workflows + minimum backend tests.
5. PR-5 Release automation and changelog policy.

## 7) Definition of Done for Open-Source Launch

- A new contributor can clone, install, run, and build without private context.
- CI passes on main and for PRs.
- Release artifacts are generated and documented.
- Legal/community files are present.
- No personal/private documents are included.
