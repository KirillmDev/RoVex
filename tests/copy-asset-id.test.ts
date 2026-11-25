import { describe, expect, it } from 'vitest';
import { copyAssetIdFeature, extractAssetId } from '../src/features/marketplace/copy-asset-id';
import { featureDefaults } from '../src/storage/schema';

describe('Copy Asset ID extraction', () => {
  it('extracts only IDs from verified catalog and library route positions', () => {
    expect(extractAssetId('/catalog/123456/example-item')).toBe('123456');
    expect(extractAssetId('/en-us/library/987654/example-asset')).toBe('987654');
    expect(extractAssetId('/games/123456/example')).toBeNull();
    expect(extractAssetId('/catalog/not-a-number/example')).toBeNull();
  });

  it('inserts its control into the page content instead of a floating layer', async () => {
    const main = document.createElement('main');
    const header = document.createElement('section');
    header.id = 'item-container';
    const heading = document.createElement('h1');
    header.append(heading);
    main.append(header);
    document.body.append(main);
    const controller = new AbortController();
    const instance = await copyAssetIdFeature.activate({
      signal: controller.signal,
      route: {
        hostname: 'www.roblox.com',
        pathname: '/catalog/123456/example-item',
        search: '',
        hash: '',
        searchParams: new URLSearchParams(),
      },
      record: featureDefaults(copyAssetIdFeature),
      ownerSelector: '[data-creator-toolkit-owner="copy-asset-id"]',
    });
    const host = document.querySelector<HTMLElement>(
      '[data-creator-toolkit-owner="copy-asset-id"]',
    )!;
    expect(host.previousElementSibling).toBe(heading);
    expect(host.style.position).toBe('');
    expect(host.shadowRoot?.querySelector('code')?.textContent).toBe('123456');
    expect(host.shadowRoot?.querySelector('button')?.textContent).toBe('Copy Asset ID');
    controller.abort();
    await instance?.deactivate?.();
  });
});
