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
  <meta name="user-data" data-userid="42">
  <header><a href="/users/42/profile">Player</a><span id="nav-robux-amount">1M+</span></header>
  <nav id="left-navigation-container"><ul>
    <li><a href="/users/42/profile">Player</a></li>
    <li><a href="/my/messages">Messages</a><span id="messages">110</span></li>
    <li><a href="/users/friends">Friends</a><span id="friends"></span></li>
    <li><a href="/communities">Communities</a><span id="unrelated">12</span></li>
  </ul></nav>
  <main>
    <div data-testid="wide-game-tile" data-universe-id="50">
      <a class="game-card-link" href="/games/18/Example">Example</a>
      <span data-testid="game-tile-stats-rating">90%</span>
    </div>
    <ul class="game-stat-container">
      <li class="game-stat"><span class="text-label">Created</span><span class="text-lead">3/2/24</span></li>
      <li class="game-stat"><span class="text-label">Updated</span><span class="text-lead">3/2/24</span></li>
    </ul>
    <section class="tab-pane store active"><ul id="rbx-passes-container">
      <li id="on-sale"><a href="/game-pass/61">On sale pass</a></li>
    </ul></section>
    <div class="group-header"><h1>Example community</h1></div>
  </main>`;

const owner = (id: string) => `[data-creator-toolkit-owner="${id}"]`;

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
          developerProducts: [{ id: 70, name: 'Boost', priceInRobux: 19, isForSale: true }],
        },
        passes: {
          gamePasses: [
            { id: 61, name: 'On sale pass', isForSale: true },
            { id: 62, name: 'Off sale pass', isForSale: false },
          ],
        },
        community: { data: [{ id: 7, created: date }] },
        balance: { robux: 1234567 },
        user: { id: 42, hasVerifiedBadge: true },
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
          sendMessage: async ({ kind }: { kind: string }) => ({
            ok: kind in data,
            data: data[kind],
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
  await expect(page.locator(owner('quick-play'))).toHaveAttribute(
    'href',
    'roblox://experiences/start?placeId=18',
  );
  await expect(page.locator(owner('wide-player-counts'))).toContainText('123');
  await expect(page.locator('.game-stat time')).toHaveCount(2);
  await expect(page.locator('.game-stat time').first()).toHaveAttribute('datetime', stamp);
  await expect(page.locator(owner('view-developer-products'))).toContainText('19 Robux');
  await page.locator(`${owner('store-sale-filter')} select`).selectOption('off');
  await expect(page.locator('#on-sale')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Off sale pass', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Boost', exact: true })).toBeHidden();
  await expect(page.locator('#nav-robux-amount')).toHaveText(/1.234.567/);
  await expect(page.getByRole('link', { name: 'My Transactions' })).toHaveCount(1);
  await expect(page.locator(owner('verified-navigation-badges'))).toHaveCount(2);
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
