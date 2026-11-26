import { expect, test } from '@playwright/test';

test('anchors the Creator Store copy action beside its self-link title', async ({ page }) => {
  const url = 'https://create.roblox.com/store/asset/148548/example';
  await page.route(url, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div><a href="/store/asset/148548/example">Model title</a><button>Save</button></div>',
    }),
  );
  await page.addInitScript(() => {
    Object.assign(window, {
      chrome: {
        storage: {
          local: { get: async () => ({}), set: async () => undefined },
          onChanged: { addListener() {} },
        },
        runtime: { onMessage: { addListener() {} } },
      },
    });
  });
  await page.goto(url);
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  await expect(page.locator('a + [data-creator-toolkit-owner="copy-asset-id"] code')).toHaveText(
    '148548',
  );
});

test('copies distinct IDs and restores wishlist entries across navigation and reload', async ({
  context,
  page,
}) => {
  const url = 'https://www.roblox.com';
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url });
  await page.route(`${url}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const title = path.includes('/bundles/') ? 'Example bundle' : 'Example asset';
    return route.fulfill({
      contentType: 'text/html',
      body: `<main><div class="item-list-carousel-title"><h1>Recommendations</h1></div>
      <div class="item-details-name-row"><h1>${title}</h1></div></main>`,
    });
  });
  await page.addInitScript(() => {
    const wishlist = 'creatorToolkit.feature.saved-marketplace';
    const bundle = 'creatorToolkit.feature.copy-bundle-id';
    const defaults: Record<string, unknown> = {
      [wishlist]: { enabled: true, options: {} },
      [bundle]: { enabled: true, options: { 'show-id': false } },
    };
    const listeners = new Set<(changes: Record<string, unknown>, area: string) => void>();
    Object.assign(window, {
      chrome: {
        storage: {
          local: {
            get: async (keys: string[]) =>
              Object.fromEntries(
                keys.map((key) => {
                  const value = localStorage.getItem(key);
                  return [key, value ? JSON.parse(value) : defaults[key]];
                }),
              ),
            set: async (items: Record<string, unknown>) => {
              for (const [key, value] of Object.entries(items)) {
                localStorage.setItem(key, JSON.stringify(value));
              }
              for (const listener of listeners) listener(items, 'local');
            },
          },
          onChanged: {
            addListener: (listener: (changes: Record<string, unknown>, area: string) => void) =>
              listeners.add(listener),
          },
        },
        runtime: { onMessage: { addListener() {} } },
      },
    });
  });
  const inject = () => page.addScriptTag({ path: 'dist/assets/content.js' });
  await page.goto(`${url}/catalog/42/Example`);
  await inject();
  const asset = page.locator('[data-creator-toolkit-owner="copy-asset-id"]');
  await expect(asset.locator('code')).toHaveText('42');
  await asset.getByRole('button', { name: 'Copy Asset ID' }).click();
  await expect(asset.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('42');
  await page.getByText('Marketplace wishlist (0)', { exact: true }).click();
  await page.getByRole('button', { name: 'Save this page' }).click();
  await expect(page.getByText('Marketplace wishlist (1)', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    history.pushState({}, '', '/bundles/70/Example');
    document.querySelector('.item-details-name-row h1')!.textContent = 'Example bundle';
    window.dispatchEvent(new Event('creator-toolkit:navigation'));
  });
  await expect(asset).toHaveCount(0);
  const bundle = page.locator('[data-creator-toolkit-owner="copy-bundle-id"]');
  await expect(bundle.locator('code')).toHaveCount(0);
  await bundle.getByRole('button', { name: 'Copy Bundle ID' }).click();
  await expect(bundle.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('70');
  await page.reload();
  await inject();
  await page.getByText('Marketplace wishlist (1)', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Example asset' })).toHaveAttribute(
    'href',
    '/catalog/42',
  );
  await page.getByRole('button', { name: 'Remove Example asset' }).click();
  await expect(page.getByText('Marketplace wishlist (0)', { exact: true })).toBeVisible();
});
