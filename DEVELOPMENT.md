# Development guide

## Commands

```powershell
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run verify
```

`npm run dev` performs a complete build and then watches the content entry. Reload the unpacked extension from `chrome://extensions` after a rebuild. Run `npm run build` when popup, background, bridge, or manifest files change.

## Adding a module

1. Create `src/features/<feature-id>/`.
2. Export a `FeatureDefinition` containing real metadata and behavior.
3. Use an exact site and conservative route matcher.
4. Register the definition once in `src/registry/index.ts`.
5. Use `context.signal` for event listeners and async cancellation.
6. Return `deactivate()` for resources that are not signal-owned.
7. Return `isHealthy()` when Roblox may remove the feature mount.
8. Mark injected roots with `data-creator-toolkit-owner="<feature-id>"`.
9. Add registry, route, activation, cleanup, and duplicate-mount tests.

Do not add placeholder modules merely to populate the UI. Categories without implemented features remain hidden from the settings sidebar.

## Feature example

```ts
export const exampleFeature: FeatureDefinition = {
  id: 'example-feature',
  category: 'productivity',
  title: 'Example Feature',
  description: 'A concrete description.',
  supportedSites: ['creator-hub'],
  routes: [{ hostnames: ['create.roblox.com'], path: /^\/dashboard/ }],
  defaultEnabled: false,
  settings: [],
  activate({ signal }) {
    const target = document.querySelector<HTMLElement>('main, [role="main"]');
    if (!target) return { isHealthy: () => false };
    const root = document.createElement('div');
    root.dataset.creatorToolkitOwner = 'example-feature';
    target.prepend(root);
    signal.addEventListener('abort', () => root.remove(), { once: true });
    return {
      deactivate: () => root.remove(),
      isHealthy: () => root.isConnected && root.parentElement === target,
    };
  },
};
```

Feature UI must mount into a verified page region. Do not use fixed launchers,
full-screen layers, or `document.body` as a visual fallback. Returning an unhealthy
instance lets the shared DOM observer retry after Roblox renders the target.

## Navigation debugging

- Confirm `assets/navigation-bridge.js` appears before `assets/content.js` in the built manifest.
- Listen for `creator-toolkit:navigation` in DevTools.
- Inspect the route matcher in `src/navigation/routes.ts`.
- Check `creatorToolkit.global` and the feature key in extension local storage.
- Verify that the hostname exactly matches a supported site.

## Settings integration debugging

All uncertain Roblox selectors are located in `src/sites/roblox/settings-integration.ts`. Do not scatter account-page selectors through React components. When Roblox changes its DOM:

1. Inspect the live account page.
2. Prefer a semantic `main` or `role="main"` anchor.
3. Update the adapter candidates.
4. Verify original account content is restored after leaving the extension route.
5. Add a regression test for any behavior that can be represented in jsdom.

## Security rules

- No remote executable code
- No analytics or backend in v0.1.0
- No authentication cookies, session tokens, or passwords
- No undocumented private Roblox API calls
- Exact hostname allowlists for stored and opened URLs
- Minimal manifest permissions
