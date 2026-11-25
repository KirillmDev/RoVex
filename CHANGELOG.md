# Changelog

This log records notable changes. Dates for historical development snapshots record when the work was documented. GitHub Releases records the actual publication date.

## [Unreleased]

## [0.6.0] - 2026-11-25

Development candidate for the Core Architecture & Foundation Update.

### Added

- Added an About RoVex Settings section with the manifest version, project links, and team profiles backed by public Roblox metadata and thumbnails.
- Chrome locale catalog with English fallback, parameterized messages, and registry-driven setting labels.
- Per-feature settings reset that preserves saved feature data.
- Development build and watch mode in `dist-dev/`.

### Changed

- Grouped feature modules by responsibility and separated the core runtime, API, settings, shared components, and styles. All 33 website feature IDs and existing storage keys are retained.
- Moved local Roblox2016 and RobloxRigs reference materials outside the runtime asset tree.

### Fixed

- Restored Marketplace ID and wishlist actions on modern detail titles and enabled the asset ID action on Creator Store routes.
- Matched the Transactions link to the native sidebar row geometry and fixed verified badge placement on the sidebar account row.
- Fixed Developer Products being blocked by an empty native Store container and used commerce product IDs in links. Preserved developer product IDs for record identity and hid entries already listed by Roblox.
- Verified navigation badges support modern account metadata and self-profile links, preserve native badges, and require Roblox to confirm the signed-in account's verification.
- Developer Products reports availability, empty results, and request failures separately.
- Quick Play anchors its control within the card interaction boundary without shifting card layout.

### Improved

- Shared DOM observation, lifecycle isolation, abortable API consumers, and bounded request caching and retries.
- The popup and worker avoid loading website feature modules. Production builds exclude sourcemaps and development references.

## [0.5.0] - 2026-11-25

### Fixed

- Sidebar count hiding now identifies numeric counters in Messages and Friends rows, including dynamically inserted or updated badges without Roblox’s older CSS classes. Disabling the setting reveals the current native counters.

### Added

- Experiences: Quick Play, concurrent player counts on wide tiles, precise created and updated dates, developer products, and a Store sale filter.
- Communities: exact creation dates from public Roblox group metadata.
- Navigation: exact signed-in Robux balance and a My Transactions sidebar shortcut.
- Miscellaneous: navigation badges based on Roblox’s official verified-account field.
- Developer: link context menus for copying eight types of Roblox IDs.
- A bounded request cache and shared DOM observer for the new page tools.

### Known limitations

- Some navigation tools require a signed-in Roblox account and a supported sidebar or header layout.
- Quick Play requires the Roblox desktop app. Items with unknown sale status remain visible in filtered Store results.

## [0.1.0] - 2026-11-23

Historical development notes.

### Added

- Manifest V3 multi-site extension foundation for Roblox and Creator Hub
- Typed, validated feature registry with site and route metadata
- AbortController-based lifecycle reconciliation and DOM recovery
- Full-page, reversible Roblox account settings integration
- Strict in-page mounting with no Creator Toolkit floating UI fallbacks
- Categorized, searchable, responsive React settings UI
- Master and feature switches, nested settings, import/export, and reset
- Versioned per-feature `creatorToolkit.*` local storage
- Creator Hub Quick Links with local persistence and ordering
- Main-site Copy Asset ID for verified catalog/library routes
- Compact popup and four-pass Vite extension build
- Vitest and Playwright test foundations

### Security

- Local-only operation with no analytics or backend
- Exact supported-host URL validation
- No cookie, token, password, or private API access
