# Creator Toolkit architecture

## Runtime overview

Creator Toolkit uses a shared architecture for two first-class site adapters:

```text
Manifest content scripts
        │
        ├── MAIN-world navigation bridge
        │       └── emits creator-toolkit:navigation
        │
        └── isolated content runtime
                ├── typed feature registry
                ├── lifecycle reconciler
                ├── versioned storage
                ├── Roblox website adapter
                └── Creator Hub feature modules
```

The main-world bridge wraps only `pushState` and `replaceState`. The isolated runtime also listens for `popstate` and `hashchange`. There is no continuous URL polling.

## Site adapters

`src/sites/site.ts` maps an exact hostname to `roblox` or `creator-hub`. Feature definitions declare `supportedSites` and explicit route rules. The same registry, storage, lifecycle, and UI primitives are used for both sites.

### Roblox settings integration

The primary settings URL is:

```text
https://www.roblox.com/my/account?creatorToolkit=settings
```

`RobloxSettingsIntegration` finds a candidate account-page `main` region. It appends an isolated settings root, temporarily hides the pre-existing direct children, and records their original `hidden` and `aria-hidden` states. When the URL marker is removed or the user navigates away, the React root is unmounted and those states are restored.

Roblox global navigation is outside the selected main region and remains intact. The integration never changes account data.

Roblox DOM selectors are isolated in `src/sites/roblox/settings-integration.ts`. If no mount target is available, the adapter leaves the native page untouched and waits for a `MutationObserver` reconciliation. It never replaces that missing target with a fixed overlay.

The account navigation entry uses conservative account-tab-list candidates. These selectors require live-site verification because Roblox can change its frontend independently of this extension.

## Feature registry

Every feature definition supplies:

- Unique kebab-case ID
- Category
- Supported sites
- Hostname/path/query/hash route rules
- Default enabled state
- Typed settings schema
- Optional data keys, dependencies, conflicts, and status
- Activation function
- Cleanup and health behavior

Registry validation runs when the bundle loads and is also covered by tests. Invalid IDs, duplicate settings, missing categories, bad category/site assignments, unknown dependencies, and invalid defaults fail fast.

## Lifecycle

`LifecycleManager.reconcile()` computes the desired active feature set from:

- Current route snapshot
- Site adapter
- Master switch
- Per-feature enabled state
- Feature status

It diffs that set against active instances. Settings changes restart the affected feature because the validated feature record fingerprint changes. A route mismatch or disabled master switch aborts and deactivates the feature immediately.

Each activation receives an `AbortSignal`. Async activation uses a generation guard so stale work cannot become the active instance. DOM health checks allow recovery after Roblox replaces a mounted subtree. Errors are caught per feature so one module cannot stop the rest of the extension.

## Settings and storage

Storage uses independent keys:

```text
creatorToolkit.meta
creatorToolkit.global
creatorToolkit.feature.<feature-id>
```

There is no duplicate aggregate settings object. Reads are validated against registry defaults. Imports reject unknown top-level, global, feature, option, and feature-data keys. Export contains only known local settings and feature data; it never includes cookies, credentials, or Roblox session information.

## UI isolation

The settings page and feature controls use Shadow DOM to prevent CSS collisions while still appearing directly inside the relevant Roblox page layout. Quick Links is inserted into the Creator Hub main region, and Copy Asset ID is inserted beside the closest verified asset content/action region. Neither uses a floating window. Styling is independently implemented with restrained Roblox-like typography, spacing, borders, and surfaces. Theme state follows Roblox classes/attributes where available and falls back to `prefers-color-scheme`.

## Build

Vite runs four single-entry production passes:

1. Popup HTML and React bundle
2. Self-contained background service worker
3. Self-contained main-world navigation bridge
4. Self-contained classic content script

Single-entry output is required because Chrome manifest content scripts cannot execute unresolved ES-module imports. The background worker remains an ES module as permitted by Manifest V3.

## Future Developer ID Tools

The registry is ready for separate, verified extractors for Universe ID, Place ID, Asset ID, Game Pass ID, and Developer Product ID. A new extractor must only be added when the URL or inspected page state unambiguously defines the identifier. No identifier may be inferred from an unrelated numeric value.
