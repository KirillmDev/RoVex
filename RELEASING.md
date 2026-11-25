# Releasing RoVex

RoVex follows Semantic Versioning and uses annotated tags such as `v0.5.0`. The Chrome manifest, package metadata, and lockfile use the numeric version without its leading `v`.

1. Finish the milestone and move its notes from **Unreleased** into a dated version section in [CHANGELOG.md](CHANGELOG.md). Use the actual release date once available and keep known limitations in the version notes.
2. Update the version in `package.json`, both root entries in `package-lock.json`, and `public/manifest.json`.
3. Run `npm ci`, `npm run format:check`, and `npm run verify`. Run `node scripts/validate-build.mjs v0.5.0` with the intended tag. Install Chromium with `npx playwright install chromium` and run `npm run test:e2e`.
4. Merge approved changes to `main` and confirm the GitHub CI run passed. Confirm the release tag does not already exist locally or remotely.
5. From an up-to-date `main`, create and push the annotated tag.

   ```sh
   git tag -a v0.5.0 -m "RoVex v0.5.0 — Feature Expansion"
   git push origin v0.5.0
   ```

6. Check the [Release workflow](https://github.com/KirillmDev/RoVex/actions/workflows/release.yml) and confirm the new [GitHub Release](https://github.com/KirillmDev/RoVex/releases) contains the versioned ZIP and SHA-256 file. GitHub supplies source archives. The workflow only publishes after its checks and asset upload pass.
7. Verify the checksum, extract the ZIP, and load the folder containing `manifest.json` from `chrome://extensions`. Confirm the installed version and settings entry point.

Run `pwsh -NoProfile -File scripts/package-release.ps1 -Tag v0.5.0` to assemble the package locally after building. Outputs are placed in the ignored `release/` directory. Reruns retain existing matching assets and fail if a matching filename contains different bytes. Use a new version for corrections to published assets.

After the baseline is published, create `refactor/core-architecture-0.6.0` from stable `main` and open a pull request for the architecture update.
