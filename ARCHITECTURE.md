# RoVex architecture

RoVex 0.6.0 keeps 33 website features on `www.roblox.com`. Historic Creator Hub definitions remain in source for compatibility but the manifest installs no scripts there.

| Directory                                         | Responsibility                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/core/`                                       | Route matching, lifecycle reconciliation, and shared frame-coalesced DOM observation              |
| `src/api/`                                        | Allowed Roblox read endpoints, typed responses, content messaging, and worker transport           |
| `src/features/`                                   | Feature behavior, with focused modules grouped by area and shared helpers for related operations  |
| `src/registry/`                                   | Feature and category definitions, route rules, and settings validation                            |
| `src/settings/`, `src/components/`, `src/styles/` | Account settings mount, shared form fields and DOM primitives, Shadow DOM styles and theme tokens |
| `src/localization/`, `public/_locales/`           | Chrome message catalogs and English fallback                                                      |
| `src/storage/`                                    | Validated local records, bootstrap, migrations, reset and import/export                           |
| `src/background/`, `src/content/`, `src/popup/`   | MV3 worker, isolated page runtime and MAIN-world navigation bridge, and toolbar UI                |
| `public/`, `resources/`                           | Distributable manifests and locale catalogs, and separate local reference materials               |

## Runtime and feature lifecycle

The MAIN-world bridge announces history changes. The isolated runtime also listens to `popstate` and `hashchange`. Reconciliation takes a batched settings snapshot for the matching routes and serializes changes. Each activation gets its own abort signal. Runtime, account settings, and features share a frame-coalesced observer. Lifecycle DOM checks request reconciliation only when a feature mount becomes unhealthy.

Use `watchDom` for dynamic page changes and `ownedElement` for feature-owned elements. Pass the activation signal to listeners and API calls. Return a teardown function for resources that are not signal-owned and an optional health check for replaceable mounts. Errors in observer and lifecycle callbacks are isolated. Development builds expose console diagnostics. Production omits those diagnostics.

The popup reads the master switch without importing the feature registry. The worker resolves browser commands and data requests without bundling the settings app or website feature registry.

## API and settings boundaries

Use `robloxApi(kind, id, { signal, cursor })` when adding requests. The worker constructs URLs from a fixed endpoint list, deduplicates in-flight work, expires cached results, bounds concurrency, respects 429 cooldowns, and briefly retries selected transient server responses. An aborted tab consumer stops waiting and cannot write stale UI. Shared worker requests can finish for other callers. Public requests omit credentials. Only existing authenticated-account and balance endpoints use Roblox's browser session, and those values stay in memory.

The registry supplies feature defaults and option schemas. Settings retain the same `creatorToolkit.*` keys and schema version. Reloading against existing 0.5.0 records requires no version migration. Per-feature reset restores its toggle and options while keeping feature data. A full reset has separate confirmation.

## Assets and packaging

Put reviewed runtime icons, fonts, or images in `public/` only when they must be addressable by the extension. Import small feature-specific source assets from their modules when possible. The moved Roblox2016 and RobloxRigs resources are in ignored `resources/local-reference/`. Their redistribution rights are unverified and they are outside the Vite public directory.

`npm run build` writes `dist/manifest.json`, `popup.html`, `_locales/`, and Vite's `assets/` folder containing the three script entry points and hashed popup assets. Keeping `assets/` avoids changing MV3 and packager entry assumptions. `npm run build:dev` writes the same entry layout with source maps to `dist-dev/`.
