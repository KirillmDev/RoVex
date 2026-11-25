# Testing RoVex

Run `npm run format:check`, `npm run verify`, `npm run build:dev`, and `node scripts/validate-build.mjs`. Production validation rejects sourcemaps and reference or test paths. Confirm the development output has maps and still loads as an unpacked extension.

## Automated tiers

- **Vitest:** Tests isolated helpers, storage defaults and migration compatibility, feature lifecycle, API cancellation and caching, localization fallback, ID extraction, and Store DTO normalization.
- **Chromium fixtures:** Run `npx playwright install chromium` and `npm run test:e2e` after building. The tests load the built bundle with mocked storage and API responses. They cover current-looking navigation, verified and unverified identities, dynamic sidebar counters, a visible Store panel following a hidden placeholder, sale filtering, repeated card-to-button hover, and cleanup on navigation and disable.
- **Live web:** Set `LIVE_ROBLOX_E2E=1` and use extension-capable Playwright Chromium. The suite loads the built extension in a temporary profile and checks the Crossroads Store and timestamps, Roblox community creation date, and a real Adopt Me developer product URL. This does not sign into Roblox or buy anything.

Set `PLAYWRIGHT_EXECUTABLE_PATH` to a compatible local Chromium executable if needed. CI uses a fresh build and runs the offline fixtures by default.

## Signed-in and desktop checks

Verify on a real verified account that the navbar/sidebar display only the correct verified badge, native badges are preserved, and disabling the feature removes injected badges. Inspect `document.documentElement.dataset.rovexVerifiedStatus` to distinguish missing identity, unavailable verification, unverified status, or an unsupported navigation label. Do not include account data in bug logs.

Check exact balance, the real Chrome context menu and clipboard, Quick Play launch in the Roblox desktop app, and site layouts with other extensions present. For rendering artifacts, compare the same page with RoVex completely disabled and enabled, then test other extensions and browser hardware acceleration separately. The hover fixture cannot identify GPU overlays or reproduce a recording that is not attached.
