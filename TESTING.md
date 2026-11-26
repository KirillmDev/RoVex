# Testing RoVex

Run `npm run format:check`, `npm run verify`, `npm run build:dev`, and `node scripts/validate-build.mjs`. Production validation rejects sourcemaps and reference or test paths. Confirm the development output has maps and still loads as an unpacked extension.

## Automated tiers

The Settings overlay suite covers scroll, resize, dismissal, visible focus, contributor tooltip sizing, and narrow header alignment. For before/after captures, place the previous content bundle at `resources/local-reference/settings-polish/before-content.js`, build the current extension, then set `ROVEX_SETTINGS_CAPTURE=1` and run the capture test in extension-capable Chromium. It uses actual tab zoom with a local Settings fixture and writes images to the ignored reference folder.

`Popover` and `Tooltip` share viewport positioning and a portal root inside the Settings shadow tree. The browser top layer handles clipping and stacking while the portal inherits the Settings theme. The positioning hook tracks the trigger only while a layer is open and dismisses it if the trigger is clipped or detached.

The Store reference files describe RoValra's own card components. RoVex uses the live Roblox Store as the visual baseline, keeping its passes and public product links while styling the added product grid. Signed-in sidebar and Home layout variants remain manual checks.

- **Vitest:** Tests isolated helpers, storage defaults and migration compatibility, feature lifecycle, API cancellation and caching, localization fallback, ID extraction, and Store DTO normalization.
- **Chromium fixtures:** Run `npx playwright install chromium` and `npm run test:e2e` after building. The tests load the built bundle with mocked storage and API responses. They cover current-looking navigation, verified and unverified identities, dynamic sidebar counters, a visible Store panel following a hidden placeholder, sale filtering, repeated card-to-button hover, and cleanup on navigation and disable.
- **Live web:** Set `LIVE_ROBLOX_E2E=1` and use extension-capable Playwright Chromium. The suite loads the built extension in a temporary profile and checks catalog and bundle IDs, Crossroads Store and timestamps, Roblox community creation date, and developer products in Adopt Me and Bee Swarm Simulator. Set `LIVE_ROBLOX_CREATOR_STORE=1` to include the public Creator Store asset smoke check. The suite uses a signed-out browser and opens no purchase controls.

Set `PLAYWRIGHT_EXECUTABLE_PATH` to a compatible local Chromium executable if needed. CI uses a fresh build and runs the offline fixtures by default.

See [FEATURE-AUDIT.md](FEATURE-AUDIT.md) for coverage by feature ID.

## Signed-in and desktop checks

Verify on a real verified account that the navbar/sidebar display only the correct verified badge, native badges are preserved, and disabling the feature removes injected badges. Inspect `document.documentElement.dataset.rovexVerifiedStatus` to distinguish missing identity, unavailable verification, unverified status, or an unsupported navigation label. Do not include account data in bug logs.

Check exact balance, the real Chrome context menu and clipboard, Quick Play launch in the Roblox desktop app, and site layouts with other extensions present. For rendering artifacts, compare the same page with RoVex completely disabled and enabled, then test other extensions and browser hardware acceleration separately. The hover fixture cannot identify GPU overlays or reproduce a recording that is not attached.
