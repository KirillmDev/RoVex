# Changelog

This log records notable changes. Dates for historical development snapshots record when the work was documented. GitHub Releases records the actual publication date.

## [Unreleased]

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
