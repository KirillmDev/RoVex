# RoVex

RoVex is an independent Manifest V3 extension for the main Roblox website. It is not affiliated with or endorsed by Roblox. The current build targets Chrome and runs on `www.roblox.com`. Creator Hub support is deferred.

RoValra informed the settings and feature architecture. RoVex uses its own implementation.

## Features

The 0.6.0 foundation update retains all 33 configurable website features. It reorganizes the extension, separates development and production builds, and updates compatibility for navigation badges, developer products, and Quick Play.

- Full-page settings at `https://www.roblox.com/my/account?creatorToolkit=settings`
- A reversible Roblox account-settings integration that waits for a native mount region
- Typed registry and route-aware lifecycle for `www.roblox.com`
- Master switch, per-feature switches, nested settings, search, import/export, and reset
- Copy user, place, community, asset, and bundle IDs
- Optional preferences for the app download button, sidebar notification counts, the Add Friends tile, scrollbar width, and keyboard focus indicators
- A link to Roblox’s native browser theme settings, plus local palettes, accent colors, text size, line spacing, content width, thumbnail corners, link underlining, and reduced motion
- Local saved experiences, Marketplace wishlist, and optional recent experience history
- A keyboard shortcut for native search and an option to hide the gift-card sidebar link

### Experiences, navigation, and developer tools

| Category      | Feature                    | Where it works                                                                                                         |
| ------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Experiences   | Quick Play                 | Standard and wide experience cards. Opens the installed Roblox app via a native protocol link.                         |
| Experiences   | Wide tile player counts    | Wide cards with a rating and available concurrent-player data.                                                         |
| Experiences   | Detailed dates             | Created and Updated fields in supported experience stat layouts. Times follow the browser locale and time zone.        |
| Experiences   | Developer products         | Visible experience Store tabs. Lists public products, prices and thumbnails when Roblox provides them.                 |
| Experiences   | Store sale filter          | Filters native and public game passes and RoVex product cards. Unknown sale status remains visible.                    |
| Communities   | Creation date              | Supported community headers when public group metadata includes a timestamp.                                           |
| Navigation    | More Robux digits          | Abbreviated balances in the signed-in Roblox header. Reads the account’s balance from Roblox.                          |
| Navigation    | My Transactions            | Supported signed-in sidebars with a Communities row.                                                                   |
| Miscellaneous | Verified navigation badges | Signed-in profile links when Roblox confirms verification and no native badge is present.                              |
| Developer     | Copy ID from links         | Right-click a supported Roblox link to copy a user, place, universe, community, asset, bundle, game pass, or badge ID. |

These features are off by default. Creator Hub remains outside the extension’s content-script scope. The context menu and clipboard permissions enable the copy actions. Read-only Roblox API host access supplies public data and the signed-in user’s own balance.

- Local-only, versioned `creatorToolkit.*` storage
- Compact popup that opens the Roblox-hosted settings page

## Requirements

- Node.js 24 LTS for the same environment used in CI
- npm, bundled with Node.js
- Chrome with Manifest V3 support

## Install and build

```powershell
cd RoVex
npm ci
npm run verify
```

The unpacked extension is written to `RoVex/dist`.

Use `npm run build:dev` or `npm run dev` to work from `dist-dev` with source maps. The production build omits source maps and local reference resources.

## Load into Chrome

1. Download and extract the versioned ZIP from [GitHub Releases](https://github.com/KirillmDev/RoVex/releases), or build from source with `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted directory containing `manifest.json`. For a source build, choose `dist`.
6. Open the extension popup and select **Open RoVex settings**.

## Manual site checks

### Roblox website

1. Visit `https://www.roblox.com/my/account?creatorToolkit=settings`.
2. Confirm Roblox global navigation remains visible.
3. Confirm the RoVex settings page appears.
4. Select **Back to Roblox settings** and confirm the original account UI returns.
5. Confirm RoVex controls are removed when their features are disabled.
6. Visit a real catalog or library asset page and test the in-page **Copy Asset ID** control.

### Creator Hub

1. Visit `https://create.roblox.com/`.
2. Confirm RoVex adds no controls to the page.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DEVELOPMENT.md](DEVELOPMENT.md), and [TESTING.md](TESTING.md) for implementation details.

## Development and releases

Feature modules live in [src/features](src/features) and their settings are wired through the [feature registry](src/registry/index.ts). See [Contributing](CONTRIBUTING.md) for branches and commit conventions, [Releasing](RELEASING.md) for validation and packaging, and the [changelog](CHANGELOG.md) for version history.

## Known limitations

Roblox site updates can change which layouts an enhancement recognizes. Some navigation tools require a signed-in Roblox account. Quick Play requires the desktop client. Roblox and Chrome can restrict what data and actions are available.

## Credits and licensing

Vexor owns the RoVex project. Othrylz and DevNamedKirill develop it. RoValra served as a functional reference.

No project-wide license has been selected. Public source visibility does not grant permission to redistribute the code or assets. The local Roblox2016 and RobloxRigs references are under ignored `resources/local-reference/` and are excluded from release packages pending a rights review.
