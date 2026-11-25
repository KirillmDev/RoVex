import { initializeStorage } from '../storage/chrome-storage';
import { openSettingsTab } from '../shared/settings-url';
import { readRobloxData } from './data';
import { refreshIdMenu, registerIdMenuListeners } from './id-context-menu';

registerIdMenuListeners();

chrome.runtime.onInstalled.addListener(() => {
  void initializeStorage().then(refreshIdMenu);
});

chrome.runtime.onStartup.addListener(() => {
  void initializeStorage().then(refreshIdMenu);
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
      () => sendResponse({ ok: false }),
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
