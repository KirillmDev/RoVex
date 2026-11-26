import { describe, expect, it, vi } from 'vitest';
import { idFromLink } from '../src/features/developer/id-context-menu';
import { quietSidebar } from '../src/features/navigation/navigation-tools';
import { matchesStoreFilter } from '../src/features/experiences/experience-store';
import { robloxEndpoint } from '../src/api/roblox-data';
import { featureDefaults } from '../src/storage/schema';
import { refreshIdMenu, registerIdMenuListeners } from '../src/background/id-context-menu';
import { idContextMenu } from '../src/features/developer/id-context-menu';
import { setFeature, setGlobal } from '../src/storage/chrome-storage';

describe('Roblox website expansion', () => {
  it('registers opt-in link menus and sends the resolved universe ID for copying', async () => {
    const existing = chrome.contextMenus;
    const existingSend = chrome.tabs.sendMessage;
    const create = vi.fn((_options: chrome.contextMenus.CreateProperties, callback?: () => void) =>
      callback?.(),
    );
    const removeAll = vi.fn(async () => undefined);
    const addListener = vi.fn();
    const send = vi.fn(async () => undefined);
    Object.assign(chrome, { contextMenus: { create, removeAll, onClicked: { addListener } } });
    Object.assign(chrome.tabs, { sendMessage: send });
    const fetch = vi.fn(async () => Response.json({ universeId: 13058 }));
    vi.stubGlobal('fetch', fetch);
    try {
      await refreshIdMenu();
      expect(create).not.toHaveBeenCalled();
      await setFeature(idContextMenu, { ...featureDefaults(idContextMenu), enabled: true });
      await refreshIdMenu();
      expect(create).toHaveBeenCalledTimes(8);
      expect(
        create.mock.calls.find(([item]) => item.id === 'rovex-id-place')?.[0].targetUrlPatterns,
      ).toContain('https://www.roblox.com/games/1*');
      registerIdMenuListeners();
      addListener.mock.calls[0][0](
        {
          menuItemId: 'rovex-id-universe',
          linkUrl: 'https://www.roblox.com/games/1818/Crossroads',
        },
        { id: 42 },
      );
      await vi.waitFor(() =>
        expect(send).toHaveBeenCalledWith(
          42,
          { type: 'rovex.copy-link-id', id: '13058' },
          { frameId: 0 },
        ),
      );
      expect(fetch.mock.calls).toHaveLength(1);
      await setGlobal({ enabled: false });
      create.mockClear();
      await refreshIdMenu();
      expect(create).not.toHaveBeenCalled();
      expect(removeAll).toHaveBeenCalled();
    } finally {
      Object.assign(chrome, { contextMenus: existing });
      Object.assign(chrome.tabs, { sendMessage: existingSend });
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ['user', '/users/12/profile'],
    ['place', '/games/12/Experience'],
    ['universe', '/universes/12'],
    ['community', '/communities/12/Name'],
    ['asset', '/catalog/12/Item'],
    ['bundle', '/bundles/12/Item'],
    ['pass', '/game-pass/12/Pass'],
    ['badge', '/badges/12/Badge'],
  ])('extracts %s IDs only from matching Roblox link paths', (type, path) => {
    expect(idFromLink(`https://www.roblox.com/es-es${path}`, type)).toEqual({
      id: '12',
      resolveUniverse: false,
    });
    expect(idFromLink(`https://example.com${path}`, type)).toBeNull();
  });

  it('resolves a universe separately instead of copying a place ID as a universe ID', () => {
    expect(idFromLink('https://www.roblox.com/games/1818/Crossroads', 'universe')).toEqual({
      id: '1818',
      resolveUniverse: true,
    });
    expect(idFromLink('https://www.roblox.com/games/1818junk', 'place')).toBeNull();
    expect(idFromLink('https://www.roblox.com/games/discover', 'place')).toBeNull();
  });

  it('keeps unknown sale states visible and honors explicit sale states', () => {
    expect(matchesStoreFilter('off', undefined)).toBe(true);
    expect(matchesStoreFilter('off', true)).toBe(false);
    expect(matchesStoreFilter('on', false)).toBe(false);
    expect(matchesStoreFilter('all', false)).toBe(true);
  });

  it('builds only known read endpoints and omits credentials for public data', () => {
    expect(robloxEndpoint('community', '7')?.url.href).toBe(
      'https://groups.roblox.com/v2/groups?groupIds=7',
    );
    expect(robloxEndpoint('games', '1,2,3')?.credentials).toBe('omit');
    expect(robloxEndpoint('balance', '12')?.credentials).toBe('include');
    expect(robloxEndpoint('games', '1,https://example.com')).toBeNull();
    expect(robloxEndpoint('https://example.com', '1')).toBeNull();
  });

  it('marks newly rendered numeric counters and restores only its own elements', async () => {
    document.body.innerHTML = `
      <nav id="left-navigation-container">
        <div role="listitem"><a href="https://www.roblox.com/my/messages">Messages</a><span id="messages">110</span></div>
        <div role="listitem"><a href="https://www.roblox.com/users/friends">Friends</a><span id="friends"></span></div>
        <div role="listitem"><a href="https://www.roblox.com/communities">Communities</a><span id="other">10</span></div>
      </nav>`;
    const controller = new AbortController();
    const context = {
      signal: controller.signal,
      ownerSelector: '',
      record: featureDefaults(quietSidebar),
      route: {
        hostname: 'www.roblox.com',
        pathname: '/home',
        search: '',
        hash: '',
        searchParams: new URLSearchParams(),
      },
    };
    const marker = 'data-rovex-sidebar-count';
    await quietSidebar.activate(context);
    try {
      expect(document.querySelector('#messages')?.hasAttribute(marker)).toBe(true);
      expect(document.querySelector('#other')?.hasAttribute(marker)).toBe(false);
      const friends = document.querySelector('#friends')!;
      friends.textContent = '500+';
      await vi.waitFor(() => expect(friends.hasAttribute(marker)).toBe(true));
    } finally {
      controller.abort();
    }
    expect(document.querySelectorAll(`[${marker}]`)).toHaveLength(0);
    expect(document.querySelector('#friends')?.textContent).toBe('500+');
  });
});
