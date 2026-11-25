import { migrateStorage } from '../storage/chrome-storage';
import { openSettingsTab } from '../shared/settings-url';
import { readRobloxData } from '../api/transport';
import { RobloxApiError } from '../api/roblox-data';
import { refreshIdMenu, registerIdMenuListeners } from './id-context-menu';

registerIdMenuListeners();

chrome.runtime.onInstalled.addListener(() => {
  void migrateStorage().then(refreshIdMenu);
});

chrome.runtime.onStartup.addListener(() => {
  void migrateStorage().then(refreshIdMenu);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === 'rovex.data' &&
    sender.url &&
    new URL(sender.url).origin === 'https://www.roblox.com'
  ) {
    const { kind, id, cursor } = message as { kind?: unknown; id?: unknown; cursor?: unknown };
    void readRobloxData(kind, id, cursor).then(
      (data) => sendResponse({ ok: true, data }),
      (error: unknown) =>
        sendResponse({
          ok: false,
          code: error instanceof RobloxApiError ? error.code : 'unavailable',
        }),
    );
    return true;
  }
  if (
    message &&
    typeof message === 'object' &&
    (message as { type?: string }).type === 'creatorToolkit.openSettings'
  ) {
    void openSettingsTab().then(
      () => sendResponse({ ok: true }),
      (error: unknown) => sendResponse({ ok: false, error: String(error) }),
    );
    return true;
  }
  return false;
});
