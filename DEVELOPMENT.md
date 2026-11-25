# Developing RoVex

Use Node.js 24 LTS and run `npm ci`.

| Command                                 | Result                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                           | Build to `dist-dev/` and watch all four entry points                              |
| `npm run build:dev`                     | Unminified development build with source maps and runtime diagnostics             |
| `npm run build` or `npm run build:prod` | Minified production build in `dist/`                                              |
| `npm run verify`                        | Type checking, linting, unit tests, and production build                          |
| `npm run format:check`                  | Prettier validation                                                               |
| `node scripts/validate-build.mjs`       | Check version metadata, manifest paths, locale catalog, and production exclusions |

After a development rebuild, reload the unpacked extension and refresh the Roblox tab. The watch command does not automatically reload Chrome.

## Adding a feature

1. Place the module in the relevant `src/features/` area and export a typed `FeatureDefinition`.
2. Choose a stable kebab-case ID, exact host and route rules, a category, and compatible setting defaults.
3. Use the feature signal for requests and listeners. Use `watchDom` and `ownedElement` when adapting live pages.
4. Register the definition once in `src/registry/index.ts`. The settings screen reads this metadata.
5. Add tests for scope, activation, changed settings, navigation, and teardown where applicable.

The `quick-play.ts` module is a small example. Larger Store functionality separates API normalization from layout detection and rendering.

## Localization

Chrome catalogs live in `public/_locales/<locale>/messages.json`. English is the manifest default. Settings resolve keys such as `feature_quick_play_title`, `feature_quick_play_description`, and `feature_<id>_setting_<key>_label`, with the English registry text as a fallback. Use `message(key, english, ...values)` for new UI strings and Chrome positional placeholders for substitutions. Use `Intl` for dates, numbers, and plural categories when needed.

Add a language by translating catalog entries, keeping the keys and placeholders. Check that missing entries fall back to English. Existing legacy UI strings can be migrated incrementally; English is the only shipped language today.
