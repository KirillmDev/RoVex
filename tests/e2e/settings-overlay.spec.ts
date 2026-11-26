import { chromium, expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = 'https://www.roblox.com/my/account?creatorToolkit=settings';
const capture = process.env.ROVEX_SETTINGS_CAPTURE === '1';
const output = 'resources/local-reference/settings-polish';
const viewport = { width: 1060, height: 780 };

async function fixture(page: Page, theme = 'dark', mockExtension = true) {
  await page.route('https://www.roblox.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><body class="${theme}-theme" style="margin:0;color-scheme:${theme};background:${theme === 'dark' ? '#121215' : '#fff'}">
        <header style="height:48px;position:sticky;top:0;z-index:9999;background:Canvas;color:CanvasText">Roblox Settings fixture</header>
        <main class="container-main" style="padding-top:105px;overflow:hidden"><section>Native Settings placeholder</section></main>
        <div style="height:1000px"></div></body>`,
    }),
  );
  if (mockExtension)
    await page.addInitScript(() => {
      Object.assign(window, {
        chrome: {
          storage: {
            local: { get: async () => ({}), set: async () => undefined },
            onChanged: { addListener() {}, removeListener() {} },
          },
          runtime: { onMessage: { addListener() {} }, sendMessage: async () => ({ ok: false }) },
        },
      });
    });
  await page.goto(url);
}

async function anchored(page: Page) {
  const trigger = await page.getByRole('button', { name: /^Filters/ }).boundingBox();
  const panel = await page.getByRole('dialog', { name: 'Filter settings' }).boundingBox();
  if (!trigger || !panel) return false;
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  const height = await page.evaluate(() => document.documentElement.clientHeight);
  return (
    Math.min(
      Math.abs(panel.y - trigger.y - trigger.height),
      Math.abs(trigger.y - panel.y - panel.height),
    ) <= 8 &&
    panel.x >= 7 &&
    panel.x + panel.width <= width - 7 &&
    panel.y >= 7 &&
    panel.y + panel.height <= height - 7
  );
}

test('anchors Filters through scrolling, collision and resize, and restores focus', async ({
  page,
}) => {
  await page.setViewportSize(viewport);
  await fixture(page);
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  const trigger = page.getByRole('button', { name: /^Filters/ });
  const panel = page.getByRole('dialog', { name: 'Filter settings' });
  await page.evaluate(() => scrollTo(0, 60));
  await trigger.click();
  await expect.poll(() => anchored(page)).toBe(true);
  await expect(panel.getByRole('checkbox', { name: 'Stable' })).toBeFocused();
  const before = await panel.boundingBox();
  await page.evaluate(() => scrollTo(0, 100));
  await expect.poll(async () => (await panel.boundingBox())?.y).not.toBe(before?.y);
  await expect.poll(() => anchored(page)).toBe(true);
  await page.setViewportSize({ width: 960, height: 480 });
  await expect.poll(() => anchored(page)).toBe(true);
  await panel.getByRole('checkbox', { name: 'Stable' }).check();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('data-active', 'true');
  await trigger.click();
  await page.getByText('Roblox Settings fixture', { exact: true }).click();
  await expect(panel).toHaveCount(0);
  await trigger.click();
  await page.evaluate(() => scrollTo(0, 1100));
  await expect(panel).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 480 });
  await page.evaluate(() => scrollTo(0, 0));
  await trigger.click();
  await expect.poll(() => anchored(page)).toBe(true);
});

test('keeps header controls aligned and reveals a compact keyboard tooltip', async ({ page }) => {
  await page.setViewportSize(viewport);
  await fixture(page, 'light');
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  const global = page.locator('.ct-master');
  const back = page.getByRole('button', { name: 'Back to Roblox settings' });
  const toggle = global.getByRole('checkbox');
  const box = (await global.boundingBox())!;
  const backBox = (await back.boundingBox())!;
  const switchBox = (await toggle.boundingBox())!;
  expect(Math.abs(box.y + box.height / 2 - switchBox.y - switchBox.height / 2)).toBeLessThan(1);
  expect(Math.abs(box.y - backBox.y)).toBeLessThan(1);
  expect(box.height).toBe(backBox.height);
  const badge = page.locator('.ct-contributor-badge').first();
  await expect(badge.locator('.ct-team-avatar')).toHaveCSS('width', '19px');
  await badge.focus();
  await expect(page.getByRole('tooltip')).toContainText('contributed to the development');
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await badge.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 720 });
  const width = await page
    .locator('.ct-header')
    .evaluate((header) => header.scrollWidth - header.clientWidth);
  expect(width).toBe(0);
});

test('captures before and after using Chromium browser zoom', async ({ page }) => {
  test.skip(!capture || !existsSync(`${output}/before-content.js`));
  test.setTimeout(90_000);
  mkdirSync(output, { recursive: true });
  await page.setViewportSize(viewport);
  await fixture(page);
  await page.addScriptTag({ path: `${output}/before-content.js` });
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.screenshot({ path: `${output}/before-dark-100.png` });

  const profile = await mkdtemp(path.join(tmpdir(), 'rovex-settings-'));
  const extension = path.resolve('dist');
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    viewport,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 12000 }));
    const tab = await context.newPage();
    await fixture(tab, 'dark', false);
    const zoom = async (factor: number) => {
      const actual = await worker.evaluate(
        async ({ factor, url }) => {
          const entry = (await chrome.tabs.query({ url: 'https://www.roblox.com/*' })).find(
            (entry) => entry.url === url,
          );
          if (entry?.id === undefined) throw new Error('Test tab missing');
          await chrome.tabs.setZoom(entry.id, factor);
          return chrome.tabs.getZoom(entry.id);
        },
        { factor, url },
      );
      expect(actual).toBeCloseTo(factor);
    };
    for (const factor of [0.8, 1, 1.25, 1.5]) {
      await zoom(factor);
      const trigger = tab.getByRole('button', { name: 'Filters', exact: true });
      await trigger.click();
      await expect.poll(() => anchored(tab)).toBe(true);
      await tab.screenshot({ path: `${output}/after-dark-${factor * 100}.png` });
      await tab.keyboard.press('Escape');
    }
    await tab.evaluate(() => {
      document.body.className = 'light-theme';
      document.body.style.colorScheme = 'light';
      document.body.style.background = '#fff';
    });
    for (const factor of [0.8, 1, 1.25, 1.5]) {
      await zoom(factor);
      await tab.getByRole('button', { name: 'Filters', exact: true }).click();
      await expect.poll(() => anchored(tab)).toBe(true);
      await tab.screenshot({ path: `${output}/after-light-${factor * 100}.png` });
      await tab.keyboard.press('Escape');
    }
  } finally {
    await context.close();
    const resolvedProfile = path.resolve(profile);
    if (
      path.dirname(resolvedProfile) === path.resolve(tmpdir()) &&
      path.basename(resolvedProfile).startsWith('rovex-settings-')
    ) {
      await rm(resolvedProfile, { recursive: true, force: true });
    }
  }
});
