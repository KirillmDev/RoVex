import { expect, test } from '@playwright/test';

const enabledFeatures = [
  'quiet-sidebar',
  'quick-play',
  'wide-player-counts',
  'detailed-experience-dates',
  'view-developer-products',
  'store-sale-filter',
  'community-creation-date',
  'full-robux-balance',
  'my-transactions-link',
  'verified-navigation-badges',
];
const stamp = '2024-03-02T12:34:56.000Z';
const fixture = `<!doctype html>
  <meta name="user-data" data-user-id="42">
  <header><a href="/my/profile"><span data-testid="profile-name">Player</span></a><span id="nav-robux-amount">1M+</span></header>
  <nav id="left-navigation-container"><ul>
    <li><a href="/users/profile"><div aria-hidden="true"></div><span class="identity">Player</span><span aria-hidden="true">›</span></a></li>
    <li><a href="/users/profile"><span>Profile</span></a></li>
    <li><a href="/my/messages">Messages</a><span id="messages">110</span></li>
    <li><a href="/users/friends">Friends</a><span id="friends"></span></li>
    <li><a href="/communities">Communities</a><span id="unrelated">12</span></li>
  </ul></nav>
  <main>
    <div data-testid="wide-game-tile" data-universe-id="50">
      <a class="game-card-link" href="/games/18/Example">Example</a>
      <span data-testid="game-tile-stats-rating">90%</span>
    </div>
    <div class="game-card-container" style="width:170px;height:90px">
      <a class="game-card-link" href="/games/19/Second">Second</a>
    </div>
    <ul class="game-stat-container">
      <li class="game-stat"><span class="text-label">Created</span><span class="text-lead">3/2/24</span></li>
      <li class="game-stat"><span class="text-label">Updated</span><span class="text-lead">3/2/24</span></li>
    </ul>
    <section class="tab-pane store" hidden></section>
    <button role="tab" id="experience-store" aria-selected="true" aria-controls="panel-store-content">Store</button>
    <section role="tabpanel" id="panel-store-content"><div id="rbx-developer-products" hidden></div><ul id="rbx-passes-container">
      <li id="on-sale"><a href="/game-pass/61">On sale pass</a></li>
    </ul></section>
    <div class="group-header"><h1>Example community</h1></div>
  </main>`;

const owner = (id: string) => `[data-creator-toolkit-owner="${id}"]`;

test('keeps Quick Play visible on touch and preserves the original card link', async ({
  browser,
}) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.route('https://www.roblox.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: fixture }),
    );
    await page.addInitScript(() => {
      const quick = 'creatorToolkit.feature.quick-play';
      (window as any).chrome = {
        storage: {
          local: {
            get: async (keys: string[]) =>
              keys.includes(quick) ? { [quick]: { enabled: true } } : {},
            set: async () => undefined,
          },
          onChanged: { addListener() {} },
        },
        runtime: { onMessage: { addListener() {} } },
      };
    });
    await page.goto('https://www.roblox.com/charts');
    await page.addScriptTag({ path: 'dist/assets/content.js' });
    const tile = page.locator('.game-card-container');
    await expect(tile.locator(owner('quick-play'))).toHaveCSS('opacity', '1');
    await expect(tile.locator(owner('quick-play'))).toHaveAttribute(
      'href',
      'roblox://experiences/start?placeId=19',
    );
    await tile.getByRole('link', { name: 'Second', exact: true }).tap();
    await expect(page).toHaveURL('https://www.roblox.com/games/19/Second');
  } finally {
    await context.close();
  }
});

test('renders, updates, and cleans up expansion features using the built content bundle', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://www.roblox.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: fixture }),
  );
  await page.addInitScript(
    ({ ids, date }) => {
      const store = Object.fromEntries(
        ids.map((id) => [`creatorToolkit.feature.${id}`, { enabled: true }]),
      );
      const listeners = new Set<(changes: Record<string, unknown>, area: string) => void>();
      const data: Record<string, unknown> = {
        universe: { universeId: 50 },
        games: { data: [{ id: 50, playing: 123, created: date, updated: date }] },
        products: {
          developerProducts: [
            {
              DeveloperProductId: 70,
              ProductId: 701,
              DisplayName: 'Boost',
              PriceInRobux: 19,
              IsForSale: true,
            },
          ],
        },
        passes: {
          gamePasses: [
            { id: 61, name: 'On sale pass', isForSale: true },
            { id: 62, name: 'Off sale pass', isForSale: false },
          ],
        },
        community: { data: [{ id: 7, created: date }] },
        balance: { robux: 1234567 },
        user: { id: 42, name: 'Player', hasVerifiedBadge: true },
      };
      (window as any).chrome = {
        storage: {
          local: {
            get: async (keys: string[]) =>
              Object.fromEntries(
                keys.filter((key) => key in store).map((key) => [key, store[key]]),
              ),
            set: async (values: Record<string, unknown>) => {
              Object.assign(store, values);
              for (const listener of listeners) listener(values, 'local');
            },
          },
          onChanged: {
            addListener: (listener: typeof listeners extends Set<infer T> ? T : never) =>
              listeners.add(listener),
          },
        },
        runtime: {
          onMessage: { addListener() {} },
          sendMessage: async ({ kind, id }: { kind: string; id: string }) => ({
            ok: kind in data,
            data: kind === 'user' && id === '43' ? { id: 43, hasVerifiedBadge: false } : data[kind],
          }),
        },
      };
    },
    { ids: enabledFeatures, date: stamp },
  );
  await page.goto('https://www.roblox.com/games/18/Example');
  await page.addScriptTag({ path: 'dist/assets/content.js' });
  await expect(page.locator('#messages')).toBeHidden();
  await page.locator('#friends').evaluate((element) => {
    element.textContent = '500+';
  });
  await expect(page.locator('#friends')).toBeHidden();
  await expect(page.locator('#unrelated')).toBeVisible();
  const wide = page.getByTestId('wide-game-tile');
  await expect(wide.locator(owner('quick-play'))).toHaveAttribute(
    'href',
    'roblox://experiences/start?placeId=18',
  );
  const standard = page.locator('.game-card-container');
  const dimensions = await standard.boundingBox();
  for (const tile of [wide, standard, wide, standard]) {
    await tile.locator('a.game-card-link').hover();
    const play = tile.locator(owner('quick-play'));
    await play.hover();
    await expect(play).toHaveCSS('opacity', '1');
  }
  expect(await standard.boundingBox()).toEqual(dimensions);
  const cardLink = standard.locator('a.game-card-link');
  const actions = standard.locator('[data-rovex-quick-actions]');
  const cardBox = (await cardLink.boundingBox())!;
  const actionBox = (await actions.boundingBox())!;
  expect(actionBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height);
  await standard.locator(owner('quick-play')).click();
  await expect(page.getByRole('dialog', { name: 'Play Second with RoVex' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Roblox', exact: true })).toHaveAttribute(
    'href',
    'roblox://experiences/start?placeId=19',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(standard.locator('a.game-card-link')).toHaveAttribute('href', '/games/19/Second');
  await expect(page.locator(owner('wide-player-counts'))).toContainText('123');
  await wide.evaluate((node) => {
    const native = document.createElement('span');
    native.dataset.testid = 'game-tile-stats-player-count';
    native.textContent = '123 playing';
    node.append(native);
  });
  await expect(page.locator(owner('wide-player-counts'))).toHaveCount(0);
  await expect(page.locator('.game-stat time')).toHaveCount(2);
  await expect(page.locator('.game-stat time').first()).toHaveAttribute('datetime', stamp);
  await expect(page.locator(owner('view-developer-products'))).toContainText('19 Robux');
  await expect(page.getByRole('link', { name: 'Boost' })).toHaveAttribute(
    'href',
    '/developer-product/50/product/701',
  );
  const nativeProducts = page.locator('#rbx-developer-products');
  await nativeProducts.evaluate((section) => {
    section.removeAttribute('hidden');
    const link = document.createElement('a');
    link.href = '/developer-product/50/product/701';
    link.textContent = 'Native Boost';
    section.append(link);
  });
  await expect(
    page.locator(owner('view-developer-products')).getByRole('link', { name: 'Boost' }),
  ).toHaveCount(0);
  await nativeProducts.evaluate((section) => section.setAttribute('hidden', ''));
  await expect(page.getByRole('link', { name: 'Boost', exact: true })).toBeVisible();
  const storePanel = page.locator('#panel-store-content');
  await storePanel.evaluate((panel) => {
    (panel as HTMLElement).hidden = true;
  });
  await expect(page.locator(owner('view-developer-products'))).toHaveCount(0);
  await storePanel.evaluate((panel) => {
    (panel as HTMLElement).hidden = false;
  });
  await expect(page.locator(owner('view-developer-products'))).toContainText('19 Robux');
  await page.locator(`${owner('store-sale-filter')} select`).selectOption('off');
  await expect(page.locator('#on-sale')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Off sale pass', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Boost', exact: true })).toBeHidden();
  await expect(page.locator('#nav-robux-amount')).toHaveText(/1.234.567/);
  const transactions = page.getByRole('link', { name: 'My Transactions' });
  await expect(transactions).toHaveCount(1);
  await expect(transactions.locator('svg')).toHaveCSS('width', '24px');
  await expect(transactions).toHaveCSS('min-height', '40px');
  await expect(page.locator(owner('verified-navigation-badges'))).toHaveCount(2);
  await expect(page.locator('.identity').locator(owner('verified-navigation-badges'))).toHaveCount(
    1,
  );
  const profileName = page.getByTestId('profile-name');
  await profileName.evaluate((node) => {
    const badge = document.createElement('span');
    badge.setAttribute('data-rblx-verified-badge-icon', '');
    node.append(badge);
  });
  await expect(page.locator(owner('verified-navigation-badges'))).toHaveCount(1);
  await page.evaluate(() =>
    document.querySelector('meta[name="user-data"]')?.setAttribute('data-user-id', '43'),
  );
  await expect(page.locator('html')).toHaveAttribute('data-rovex-verified-status', 'not-verified');
  await expect(page.locator(owner('verified-navigation-badges'))).toHaveCount(0);
  await page.evaluate(() => {
    history.pushState({}, '', '/communities/7/Example');
    window.dispatchEvent(new Event('creator-toolkit:navigation'));
  });
  await expect(page.locator(`${owner('community-creation-date')} time`)).toHaveAttribute(
    'datetime',
    stamp,
  );
  await expect(page.locator('.game-stat time')).toHaveCount(0);
  await expect(page.locator('#on-sale')).toBeVisible();
  await page.evaluate(() =>
    chrome.storage.local.set({ 'creatorToolkit.global': { enabled: false } }),
  );
  await expect(page.locator('#messages')).toBeVisible();
  await expect(page.locator('#friends')).toBeVisible();
  await expect(page.locator('#nav-robux-amount')).toHaveText('1M+');
  await expect(page.locator(owner('quick-play'))).toHaveCount(0);
  await expect(page.locator(owner('community-creation-date'))).toHaveCount(0);
  expect(errors).toEqual([]);
});
