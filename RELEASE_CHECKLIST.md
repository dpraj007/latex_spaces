# Release Checklist

1. Confirm CI is green on the release branch.
2. Update `CHANGELOG.md` under a new version heading.
3. Bump version in `desktop/package.json`.
4. Build desktop installers (`win-arm64` and `win-x64`).
5. Generate checksums for release artifacts.
6. Create Git tag (`vX.Y.Z`) and push.
7. Publish GitHub Release with:
   - changelog highlights
   - installer artifacts
   - checksums
   - known limitations and prerequisites (LaTeX distribution)
