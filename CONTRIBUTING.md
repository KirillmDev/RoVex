# Contributing to RoVex

Report bugs or suggest improvements in [GitHub Issues](https://github.com/KirillmDev/RoVex/issues/new/choose). Include the RoVex version, Chrome version, relevant Roblox page, expected behavior, and reproduction steps. Redact account names and private data from screenshots and logs. See [Security](SECURITY.md) for sensitive reports.

`main` represents the approved, stable source. Use short-lived branches such as `feature/server-filters`, `fix/sidebar-notifications`, or `release/0.6.0`. Use a pull request for substantial changes. Keep each commit focused and use Conventional Commits, for example `fix: restore sidebar notification counts` or `test: cover browser context menu IDs`.

Run `npm ci`, `npm run format:check`, and `npm run verify`. For browser tests, install Chromium with `npx playwright install chromium` and run `npm run test:e2e` after building. See [Releasing](RELEASING.md) for tag and release checks.

The project does not yet have a redistribution license. Before submitting code or assets, confirm that you have the right to share them and coordinate licensing with the maintainers.
