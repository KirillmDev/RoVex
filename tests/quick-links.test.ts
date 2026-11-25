import { describe, expect, it, vi } from 'vitest';
import {
  isSupportedCreatorUrl,
  quickLinksFeature,
  sanitizeQuickLinks,
} from '../src/features/quick-links/quick-links';
import { featureDefaults, featureKey } from '../src/storage/schema';
import { mockStorage } from './setup';

describe('Quick Links validation', () => {
  it('allows only secure Creator Hub destinations', () => {
    expect(isSupportedCreatorUrl('https://create.roblox.com/dashboard')).toBe(true);
    expect(isSupportedCreatorUrl('http://create.roblox.com/dashboard')).toBe(false);
    expect(isSupportedCreatorUrl('https://www.roblox.com/')).toBe(false);
    expect(isSupportedCreatorUrl('https://user@create.roblox.com/dashboard')).toBe(false);
    expect(isSupportedCreatorUrl('javascript:alert(1)')).toBe(false);
  });

  it('removes invalid, duplicate, and excess shortcuts', () => {
    const value = [
      { id: 'one', title: 'One', url: 'https://create.roblox.com/dashboard' },
      { id: 'one', title: 'Duplicate', url: 'https://create.roblox.com/creations' },
      { id: 'bad', title: 'Bad', url: 'https://example.com' },
      { id: 'two', title: 'Two', url: 'https://create.roblox.com/creations' },
    ];
    expect(sanitizeQuickLinks(value, 2).map(({ id }) => id)).toEqual(['one', 'two']);
  });

  it('adds, reorders, opens, and removes persisted shortcuts through its UI', async () => {
    const main = document.createElement('main');
    main.setAttribute('role', 'main');
    document.body.append(main);
    const controller = new AbortController();
    const record = featureDefaults(quickLinksFeature);
    const instance = await quickLinksFeature.activate({
      signal: controller.signal,
      route: {
        hostname: 'create.roblox.com',
        pathname: '/dashboard',
        search: '',
        hash: '',
        searchParams: new URLSearchParams(),
      },
      record,
      ownerSelector: '[data-creator-toolkit-owner="quick-links"]',
    });
    const host = document.querySelector<HTMLElement>('[data-creator-toolkit-owner="quick-links"]')!;
    expect(host.parentElement).toBe(main);
    const shadow = host.shadowRoot!;
    shadow.querySelector<HTMLDetailsElement>('details')!.open = true;
    shadow.querySelector<HTMLButtonElement>('.add')!.click();
    await vi.waitFor(() => {
      const stored = mockStorage[featureKey('quick-links')] as { data?: { shortcuts?: unknown[] } };
      expect(stored.data?.shortcuts).toHaveLength(1);
    });
    await vi.waitFor(() =>
      expect(shadow.querySelector<HTMLAnchorElement>('a')?.href).toContain(
        'create.roblox.com/dashboard',
      ),
    );

    history.replaceState(null, '', '/creations');
    shadow.querySelector<HTMLButtonElement>('.add')!.click();
    await vi.waitFor(() => expect(shadow.querySelectorAll('li')).toHaveLength(2));
    shadow.querySelectorAll<HTMLButtonElement>('button[aria-label^="Move"]')[2].click();
    await vi.waitFor(() =>
      expect(shadow.querySelector<HTMLAnchorElement>('li a')?.href).toContain('/creations'),
    );
    shadow.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')!.click();
    await vi.waitFor(() => expect(shadow.querySelectorAll('li')).toHaveLength(1));
    controller.abort();
    await instance?.deactivate?.();
    expect(host.isConnected).toBe(false);
  });
});
