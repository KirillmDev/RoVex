# Testing Creator Toolkit

## Automated verification

Run the complete non-browser verification pipeline:

```powershell
npm run verify
```

It runs TypeScript, ESLint, Vitest, and the production build.

The Vitest suite covers:

- Registry validation
- Both site adapters and route components
- Feature activation, cleanup, master disable, and DOM recovery
- Versioned storage defaults and persistence
- Import validation, preview, and application
- Unknown-key rejection
- Full-page settings mount and reversible native-content restoration
- Settings search and master-switch access
- Quick Links URL validation, in-page mounting, and UI behavior
- Verified asset-ID path extraction and in-page control mounting

## Browser smoke test

```powershell
npm run build
npm run test:e2e
```

Playwright uses its managed Chromium by default. To run against an existing local
Chrome installation instead, set `PLAYWRIGHT_EXECUTABLE_PATH` to the browser
executable before invoking the command.

Playwright serves `dist` locally, supplies a browser API mock, and checks that the popup exposes only the branding, master switch, version, and settings launcher. Install Chromium with `npx playwright install chromium` if no compatible Playwright browser is present.

To exercise the unpacked extension against current public Roblox routes, set
`LIVE_ROBLOX_E2E=1` as well. This opt-in check visits a Creator Store asset and a
Roblox game page and verifies the visible Asset ID and Place ID actions.

## Manual testing required

Automated tests do not prove compatibility with Roblox’s live DOM. Before release, manually verify:

- Account navigation entry placement
- Primary `main` mount selector on the current account page
- Preservation of Roblox global navigation
- Native account content restoration on pushState, popstate, reload, and direct link
- Light and dark theme appearance
- Mobile-width settings layout
- Screen-reader labels and keyboard category navigation
- Quick Links across real Creator Hub SPA transitions
- Copy Asset ID only on genuine catalog/library asset routes
- Immediate cleanup when toggles or the master switch are disabled

Record the Roblox UI version or test date when validating selectors.
