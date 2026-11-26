import { test, expect } from '@playwright/test';

test('opens contributor details, combines filters and restores the presentation preference', async ({
  page,
}) => {
  await page.route('https://www.roblox.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body class="dark-theme"><main class="container-main"><h1>Account settings</h1></main></body></html>',
    }),
  );
  await page.addInitScript(() => {
    Object.assign(window, {
      chrome: {
        storage: {
          local: {
            get: async (keys: string | string[]) =>
              Object.fromEntries(
                (Array.isArray(keys) ? keys : [keys]).map((key) => [
                  key,
                  JSON.parse(localStorage.getItem(key) ?? 'null'),
                ]),
              ),
            set: async (values: Record<string, unknown>) => {
              for (const [key, value] of Object.entries(values))
                localStorage.setItem(key, JSON.stringify(value));
            },
          },
          onChanged: { addListener() {}, removeListener() {} },
        },
        runtime: { onMessage: { addListener() {} }, sendMessage: async () => ({ ok: false }) },
      },
    });
  });
  await page.setViewportSize({ width: 430, height: 850 });
  await page.goto('https://www.roblox.com/my/account?creatorToolkit=settings');
  const inject = () => page.addScriptTag({ path: 'dist/assets/content.js' });
  await inject();
  await page.getByRole('button', { name: 'Contributors', exact: true }).click();
  await expect(page.getByText('Some public profile details are unavailable.')).toBeVisible();
  await page.getByLabel('Sort').selectOption('least');
  await expect(page.locator('.ct-contributor-row').first()).toContainText('Othrylz');
  await page.getByLabel('Sort').selectOption('most');
  await page.getByLabel('Developer Mode').check();
  await page.getByRole('button', { name: /VexorCreator/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('quick-play', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /VexorCreator/ })).toBeFocused();
  await page.getByLabel('Show feature contributors').uncheck();
  await page.reload();
  await inject();
  await page.getByRole('button', { name: 'Contributors', exact: true }).click();
  await expect(page.getByLabel('Show feature contributors')).not.toBeChecked();
  await page.getByLabel('Search RoVex settings').fill('Experiences');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByLabel('Stable', { exact: true }).check();
  await page.getByRole('radio', { name: /Othrylz/ }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByText('No settings match this search.')).toBeVisible();
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByRole('radio', { name: /VexorCreator/ }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Quick Play on cards' })).toBeVisible();
  await expect(page.locator('.ct-credits-inline')).toHaveCount(0);
});

test('loads public server pages on demand, filters full instances and handles unavailable data', async ({
  page,
}) => {
  await page.route('https://www.roblox.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<main><section id="game-instances" class="tab-pane"><h2>Servers</h2></section></main>',
    }),
  );
  await page.addInitScript(() => {
    let first = true;
    Object.assign(window, {
      chrome: {
        storage: {
          local: {
            get: async () => ({
              'creatorToolkit.feature.public-server-browser': { enabled: true },
            }),
            set: async () => undefined,
          },
          onChanged: { addListener() {} },
        },
        runtime: {
          onMessage: { addListener() {} },
          sendMessage: async ({ kind, cursor }: { kind: string; cursor?: string }) => {
            if (kind !== 'public-servers' || first) {
              first = false;
              return { ok: false };
            }
            return {
              ok: true,
              data: {
                data: [
                  {
                    id: cursor
                      ? '12345678-1234-1234-1234-123456789abc'
                      : '00000000-1234-1234-1234-123456789abc',
                    playing: cursor ? 2 : 10,
                    maxPlayers: 10,
                  },
                ],
                nextPageCursor: cursor ? null : 'page2',
              },
            };
          },
        },
      },
    });
  });
  await page.goto('https://www.roblox.com/games/123/Example#!/game-instances');
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  await page.getByRole('button', { name: 'Load public servers' }).click();
  await expect(page.getByRole('status')).toHaveText('Public servers are currently unavailable.');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('10 / 10 players · Full')).toBeVisible();
  await page.getByRole('button', { name: 'Load more' }).click();
  await page.getByLabel('Hide full servers').check();
  await expect(page.getByText('2 / 10 players')).toBeVisible();
  await expect(page.getByText('10 / 10 players · Full')).toHaveCount(0);
});

test('shields late account data and restores the desktop sidebar on disable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('https://www.roblox.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div id="left-navigation-container"><div class="left-nav"><nav><a href="/home"><span class="size-1000">H</span><span>Home</span></a></nav></div></div><header id="header"><button aria-label="Robux"><span id="nav-robux-amount">55</span></button></header><main class="container-main"><div class="tab-content"><div role="tabpanel"></div></div></main>',
    }),
  );
  await page.addInitScript(() => {
    let enabled = true;
    const listeners = new Set<(changes: Record<string, unknown>) => void>();
    Object.assign(window, {
      chrome: {
        storage: {
          local: {
            get: async () => ({
              'creatorToolkit.global': { enabled },
              'creatorToolkit.feature.streamer-mode': {
                enabled: true,
                options: { 'allow-reveal': true },
              },
              'creatorToolkit.feature.collapse-sidebar': { enabled: true },
            }),
            set: async () => undefined,
          },
          onChanged: {
            addListener(callback: (changes: Record<string, unknown>) => void) {
              listeners.add(callback);
            },
            removeListener() {},
          },
        },
        runtime: { onMessage: { addListener() {} } },
      },
    });
    window.addEventListener('disable-fixture', () => {
      enabled = false;
      listeners.forEach((listener) =>
        listener({ 'creatorToolkit.global': { newValue: { enabled } } }),
      );
    });
  });
  await page.goto('https://www.roblox.com/my/account#!/info');
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  await expect(
    page.getByText('Streamer Mode is shielding this account settings panel.'),
  ).toBeVisible();
  await page.locator('[role="tabpanel"]').evaluate((node) => {
    node.textContent = 'Late fixture data';
  });
  await expect(page.getByText('Late fixture data')).toBeHidden();
  await expect(page.locator('#nav-robux-amount')).toBeHidden();
  await page.getByRole('button', { name: 'Reveal Robux' }).click();
  await expect(page.locator('#nav-robux-amount')).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#!/browser-preferences';
  });
  await expect(page.locator('#nav-robux-amount')).toBeHidden();
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.locator('.left-nav')).toHaveCSS('width', '72px');
  await page.evaluate(() => window.dispatchEvent(new Event('disable-fixture')));
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveCount(0);
  await expect(page.locator('#nav-robux-amount')).toBeVisible();
});

test('bookmarks a hydrated card and displays local categories on Home', async ({ page }) => {
  await page.route('https://www.roblox.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<main><div id="HomeContainer"><h1>Home</h1><div class="game-card-container"><a class="game-card-link" href="/games/123/Example">Example</a></div></div></main>',
    }),
  );
  await page.addInitScript(() => {
    const key = 'creatorToolkit.feature.saved-experiences';
    const data: Record<string, unknown> = {
      [key]: {
        enabled: true,
        options: { 'card-actions': true },
        data: { entries: [{ path: '/games/321', title: 'Saved earlier', category: 'Favorites' }] },
      },
    };
    const listeners = new Set<(changes: Record<string, unknown>) => void>();
    Object.assign(window, {
      chrome: {
        storage: {
          local: {
            get: async () => data,
            set: async (patch: Record<string, unknown>) => {
              Object.assign(data, patch);
              for (const listener of listeners) listener(patch);
            },
          },
          onChanged: {
            addListener(callback: (changes: Record<string, unknown>) => void) {
              listeners.add(callback);
            },
          },
        },
        runtime: { onMessage: { addListener() {} } },
      },
    });
  });
  await page.goto('https://www.roblox.com/home');
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  await page.getByRole('button', { name: 'Bookmark: Example' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark: Example' })).toHaveCount(1);
  await page.getByText('Saved experiences (2)', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Bookmark category', exact: true })
    .selectOption('Favorites');
  await expect(page.getByRole('link', { name: 'Saved earlier' })).toBeVisible();
  await expect(
    page.locator('details').getByRole('link', { name: 'Example', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove bookmark: Example' }).click();
  await expect(page.getByText('Saved experiences (1)', { exact: true })).toBeVisible();
});
