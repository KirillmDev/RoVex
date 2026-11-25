import { idContextMenu, idFromLink, idLinkTypes } from '../features/id-context-menu';
import { robloxId } from '../shared/roblox-data';
import { getFeature, getGlobal } from '../storage/chrome-storage';
import { featureKey, GLOBAL_KEY } from '../storage/schema';
import { readRobloxData } from './data';

const prefix = 'rovex-id-';
const site = 'https://www.roblox.com/*';
let refresh = Promise.resolve();

async function enabled() {
  const [global, feature] = await Promise.all([getGlobal(), getFeature(idContextMenu)]);
  return global.enabled && feature.enabled;
}

export function refreshIdMenu() {
  refresh = refresh
    .catch(() => undefined)
    .then(async () => {
      await chrome.contextMenus.removeAll();
      if (!(await enabled())) return;
      for (const { key, title, paths } of idLinkTypes) {
        const patterns = paths.flatMap((path) =>
          Array.from({ length: 9 }, (_, i) => i + 1).flatMap((digit) => [
            `https://www.roblox.com/${path}/${digit}*`,
            `https://www.roblox.com/*/${path}/${digit}*`,
          ]),
        );
        await new Promise<void>((resolve) => {
          chrome.contextMenus.create(
            {
              id: prefix + key,
              title: `Copy ${title} ID`,
              contexts: ['link'],
              documentUrlPatterns: [site],
              targetUrlPatterns: patterns,
            },
            () => {
              void chrome.runtime.lastError;
              resolve();
            },
          );
        });
      }
    });
  return refresh;
}

export function registerIdMenuListeners() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[GLOBAL_KEY] || changes[featureKey(idContextMenu.id)]))
      void refreshIdMenu();
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (
      typeof info.menuItemId !== 'string' ||
      !info.menuItemId.startsWith(prefix) ||
      !info.linkUrl ||
      tab?.id === undefined
    )
      return;
    const tabId = tab.id;
    const type = info.menuItemId.slice(prefix.length);
    const action = idFromLink(info.linkUrl, type);
    if (!action) return;
    void (async () => {
      if (!(await enabled())) return;
      let id: string | null = action.id;
      if (action.resolveUniverse) {
        const details = (await readRobloxData('universe', id).catch(() => null)) as {
          universeId?: unknown;
        } | null;
        id = robloxId(details?.universeId);
      }
      await chrome.tabs.sendMessage(tabId, { type: 'rovex.copy-link-id', id }, { frameId: 0 });
    })().catch(() => undefined);
  });
}
