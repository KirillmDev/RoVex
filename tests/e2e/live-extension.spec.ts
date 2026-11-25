import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test.skip(!process.env.LIVE_ROBLOX_E2E, 'Set LIVE_ROBLOX_E2E=1 to test public Roblox pages.');
test.setTimeout(120_000);

test('injects visible ID actions on current public Roblox routes', async () => {
  const extensionPath = path.resolve('dist');
  const profile = await mkdtemp(path.join(tmpdir(), 'creator-toolkit-playwright-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 12_000 }));
    const featureKeys = [
      'detailed-experience-dates',
      'view-developer-products',
      'store-sale-filter',
      'community-creation-date',
    ].map((id) => `creatorToolkit.feature.${id}`);
    await worker.evaluate(
      (keys) =>
        chrome.storage.local.set(Object.fromEntries(keys.map((key) => [key, { enabled: true }]))),
      featureKeys,
    );
    const page = await context.newPage();
    if (process.env.LIVE_ROBLOX_CREATOR_STORE) {
      await page.goto(
        'https://create.roblox.com/store/asset/148548/open-admin-house-whith-bright-green-spawn-point-h',
        {
          waitUntil: 'domcontentloaded',
          timeout: 25_000,
        },
      );
      await expect(page.locator('[data-creator-toolkit-owner="copy-asset-id"] code')).toHaveText(
        '148548',
        { timeout: 15_000 },
      );
    }

    await page.goto('https://www.roblox.com/catalog/1029025/The-Classic-ROBLOX-Fedora', {
      waitUntil: 'domcontentloaded',
      timeout: 25_000,
    });
    await expect(page.locator('[data-creator-toolkit-owner="copy-asset-id"] code')).toHaveText(
      '1029025',
    );
    await page.goto('https://www.roblox.com/bundles/192/Korblox-Deathspeaker', {
      waitUntil: 'domcontentloaded',
      timeout: 25_000,
    });
    await expect(page.locator('[data-creator-toolkit-owner="copy-bundle-id"] code')).toHaveText(
      '192',
    );
    await expect(page.locator('[data-creator-toolkit-owner="copy-asset-id"]')).toHaveCount(0);

    await page.goto('https://www.roblox.com/games/1818/Crossroads', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    const placeAction = page.locator('[data-creator-toolkit-owner="copy-place-id"]');
    await expect(placeAction).toHaveCount(1, { timeout: 30_000 });
    await expect(placeAction.locator('code')).toHaveText('1818');
    await expect(page.locator('.game-stat time[datetime]')).toHaveCount(2, { timeout: 15_000 });
    await page.locator('a[href="#store"]').first().click({ timeout: 10_000 });
    const products = page.locator('[data-creator-toolkit-owner="view-developer-products"]');
    await expect(products).toBeVisible({ timeout: 15_000 });
    await expect(products.getByRole('status')).not.toHaveText(/Loading|temporarily unavailable/, {
      timeout: 15_000,
    });
    await page.getByLabel('Sale status').selectOption('off');
    await expect(page.getByRole('heading', { name: 'Public game passes' })).toBeVisible();

    await page.goto('https://www.roblox.com/communities/7/Roblox', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await expect(
      page.locator('[data-creator-toolkit-owner="community-creation-date"] time'),
    ).toHaveAttribute('datetime', '2009-07-30T05:36:10.417Z', { timeout: 15_000 });

    await page.goto('https://www.roblox.com/games/920587237', {
      waitUntil: 'commit',
      timeout: 30_000,
    });
    const storeTab = page.locator('a[href="#store"]').first();
    await expect(async () => {
      await storeTab.click({ timeout: 3_000 });
      await expect(products).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000, intervals: [500, 1000, 2000] });
    const adoptProduct = page.locator('a[href="/developer-product/383310974/product/452166553"]');
    await expect(adoptProduct.filter({ visible: true }).first()).toBeVisible({ timeout: 25_000 });
    await expect(products.locator('[role="status"]')).not.toHaveText(
      /Loading|temporarily unavailable/,
    );

    await page.goto('https://www.roblox.com/games/1537690962', {
      waitUntil: 'domcontentloaded',
      timeout: 25_000,
    });
    await page.locator('a[href="#store"]').first().click({ timeout: 15_000 });
    await expect(products.getByRole('link', { name: 'Silver Egg', exact: true })).toHaveAttribute(
      'href',
      '/developer-product/601130232/product/170762750',
      { timeout: 20_000 },
    );
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
