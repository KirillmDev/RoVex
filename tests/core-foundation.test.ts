import { describe, expect, it, vi } from 'vitest';
import { readRobloxData } from '../src/api/transport';
import { robloxApi } from '../src/api/roblox-data';
import { watchDom } from '../src/core/live-dom';
import { featureMessage, message } from '../src/localization/messages';
import { normalizeStoreItem } from '../src/features/experiences/experience-store';
import { resetFeatureSettings, setFeature } from '../src/storage/chrome-storage';
import { websiteFeatureRegistry } from '../src/registry';

describe('0.6.0 foundation', () => {
  it('falls back to English and formats parameterized messages', () => {
    expect(message('not_translated', 'Play $1', 'Crossroads')).toBe('Play Crossroads');
    expect(featureMessage('quick-play', 'title', 'Quick Play')).toBe('Quick Play');
  });

  it('coalesces concurrent requests and serves the cached result', async () => {
    const fetch = vi.fn(async () => Response.json({ universeId: 800 }));
    vi.stubGlobal('fetch', fetch);
    try {
      const [first, second] = await Promise.all([
        readRobloxData('universe', '900123'),
        readRobloxData('universe', '900123'),
      ]);
      expect(first).toEqual(second);
      expect(await readRobloxData('universe', '900123')).toEqual(first);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('abandons a caller after abort without waiting for the transport', async () => {
    const controller = new AbortController();
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce(() => new Promise(() => {}));
    const request = robloxApi('universe', '900124', { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('contains observer errors and unsubscribes on abort', async () => {
    const a = new AbortController();
    const b = new AbortController();
    const update = vi.fn();
    try {
      watchDom(a.signal, () => {
        throw new Error('test observer');
      });
      watchDom(b.signal, update);
      expect(update).toHaveBeenCalledTimes(1);
      document.body.append(document.createElement('div'));
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(2));
      b.abort();
      document.body.append(document.createElement('div'));
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(update).toHaveBeenCalledTimes(2);
    } finally {
      a.abort();
      b.abort();
    }
  });

  it('keeps DeveloperProductId and the commerce link ID distinct', () => {
    expect(
      normalizeStoreItem(
        {
          DeveloperProductId: 2215085,
          ProductId: 452166553,
          DisplayName: '10000 Bucks',
          DisplayIconImageAssetId: 6998151061,
          PriceInRobux: 3910,
          IsForSale: true,
        },
        'products',
      ),
    ).toEqual({
      id: '2215085',
      linkId: '452166553',
      name: '10000 Bucks',
      icon: '6998151061',
      price: 3910,
      onSale: true,
    });
  });

  it('resets configuration without deleting data stored by the feature', async () => {
    const feature = websiteFeatureRegistry.find(({ id }) => id === 'saved-experiences')!;
    await setFeature(feature, { enabled: true, options: {}, data: { entries: [{ id: '42' }] } });
    expect(await resetFeatureSettings(feature)).toEqual({
      enabled: false,
      options: {},
      data: { entries: [{ id: '42' }] },
    });
  });
});
