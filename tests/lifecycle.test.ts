import { describe, expect, it } from 'vitest';
import { LifecycleManager } from '../src/core/lifecycle-manager';
import { getFeature, setFeature, setGlobal } from '../src/storage/chrome-storage';
import { initializeStorage } from '../src/storage/initialize';
import { snapshotRoute } from '../src/core/routes';
import { websitePreferences } from '../src/features/website-preferences';

describe('feature lifecycle', () => {
  it('refreshes the place ID when Roblox reuses the experience header', async () => {
    const header = document.createElement('section');
    header.className = 'game-main-content';
    header.append(document.createElement('h1'));
    document.body.append(header);
    let pathname = '/games/1818/Crossroads';
    const manager = new LifecycleManager(() =>
      snapshotRoute({ hostname: 'www.roblox.com', pathname, search: '', hash: '' }),
    );
    const shownId = () =>
      header
        .querySelector('[data-creator-toolkit-owner="copy-place-id"]')
        ?.shadowRoot?.querySelector('code')?.textContent;
    try {
      await manager.start();
      expect(shownId()).toBe('1818');
      pathname = '/games/1819/Other';
      await manager.reconcile();
      expect(shownId()).toBe('1819');
    } finally {
      await manager.stop();
    }
  });

  it('restores the app download button when the preference is turned off', async () => {
    const preference = websitePreferences.find(({ id }) => id === 'hide-app-download')!;
    const manager = new LifecycleManager(() =>
      snapshotRoute({ hostname: 'www.roblox.com', pathname: '/home', search: '', hash: '' }),
    );
    await initializeStorage();
    await manager.start();
    try {
      const record = await getFeature(preference);
      expect(record.enabled).toBe(false);
      await setFeature(preference, { ...record, enabled: true });
      await manager.reconcile();
      const button = document.createElement('button');
      button.className = 'download-app-nav-item';
      document.body.append(button);
      expect(getComputedStyle(button).display).toBe('none');
      await setFeature(preference, record);
      await manager.reconcile();
      expect(getComputedStyle(button).display).not.toBe('none');
    } finally {
      await manager.stop();
    }
  });

  it('mounts once, recovers a removed mount, and cleans up for the master switch', async () => {
    document.body.append(document.createElement('main'));
    await initializeStorage();
    const manager = new LifecycleManager();
    await manager.start();
    expect(manager.isActive('quick-links')).toBe(true);
    expect(document.querySelectorAll('[data-creator-toolkit-owner="quick-links"]')).toHaveLength(1);
    await manager.reconcile();
    expect(document.querySelectorAll('[data-creator-toolkit-owner="quick-links"]')).toHaveLength(1);

    document.querySelector('[data-creator-toolkit-owner="quick-links"]')?.remove();
    await manager.reconcile();
    expect(document.querySelectorAll('[data-creator-toolkit-owner="quick-links"]')).toHaveLength(1);

    await setGlobal({ enabled: false });
    await manager.reconcile();
    expect(manager.isActive('quick-links')).toBe(false);
    expect(document.querySelector('[data-creator-toolkit-owner="quick-links"]')).toBeNull();
    await manager.stop();
  });

  it('activates and cleans up a main Roblox website module', async () => {
    const header = document.createElement('section');
    header.id = 'item-container';
    document.body.append(header);
    await initializeStorage();
    const manager = new LifecycleManager(() =>
      snapshotRoute({
        hostname: 'www.roblox.com',
        pathname: '/catalog/12345/example-item',
        search: '',
        hash: '',
      }),
    );
    await manager.start();
    expect(manager.isActive('copy-asset-id')).toBe(true);
    expect(document.querySelectorAll('[data-creator-toolkit-owner="copy-asset-id"]')).toHaveLength(
      1,
    );
    await manager.stop();
    expect(document.querySelector('[data-creator-toolkit-owner="copy-asset-id"]')).toBeNull();
  });
});
