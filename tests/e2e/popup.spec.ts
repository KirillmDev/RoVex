import { expect, test } from '@playwright/test';
import path from 'node:path';

test('popup exposes only the master switch and settings launcher', async ({ page }) => {
  await page.route('https://rovex.test/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!/^\/(?:popup\.html|assets\/[\w.-]+\.(?:js|css))$/.test(pathname)) return route.abort();
    return route.fulfill({ path: path.join('dist', pathname.slice(1)) });
  });
  await page.addInitScript(() => {
    const values: Record<string, unknown> = {};
    (window as any).chrome = {
      storage: {
        local: {
          get: async (keys: string[]) =>
            Object.fromEntries(
              keys.filter((key) => key in values).map((key) => [key, values[key]]),
            ),
          set: async (items: Record<string, unknown>) => Object.assign(values, items),
        },
        onChanged: { addListener() {}, removeListener() {} },
      },
      runtime: {
        sendMessage(_message: unknown, callback: (value: unknown) => void) {
          callback({ ok: true });
        },
        getManifest: () => ({ version: '0.1.0' }),
      },
    };
    window.close = () => undefined;
  });
  await page.goto('https://rovex.test/popup.html');
  await expect(page.getByRole('heading', { name: 'RoVex' })).toBeVisible();
  await expect(page.getByLabel('Enable RoVex')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Open RoVex settings' })).toBeVisible();
});
