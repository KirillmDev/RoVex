import { PRIMARY_SETTINGS_URL } from '../../shared/settings-url';
import { mountSettings, type SettingsMount } from '../../content/settings/mount';

export const ROBLOX_ACCOUNT_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?my\/account\/?$/i;

// These selectors are intentionally isolated because Roblox can replace its account settings DOM.
// They must be confirmed during live-site manual testing after each substantial Roblox UI update.
const MOUNT_TARGET_SELECTORS = ['main.container-main', 'main[role="main"]', 'main'] as const;
const ACCOUNT_NAV_SELECTORS = [
  'main.container-main ul[role="tablist"]',
  'main[role="main"] ul[role="tablist"]',
  'main ul[role="tablist"]',
] as const;

function isSettingsRoute() {
  const params = new URLSearchParams(location.search);
  return (
    location.hostname === 'www.roblox.com' &&
    ROBLOX_ACCOUNT_PATH.test(location.pathname) &&
    params.get('creatorToolkit') === 'settings' &&
    !params.has('rovalra')
  );
}

function findFirst(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) return element;
  }
  return null;
}

function addAccountNavigationEntry(): void {
  if (!ROBLOX_ACCOUNT_PATH.test(location.pathname)) return;
  if (new URLSearchParams(location.search).has('rovalra')) {
    document.querySelector('[data-creator-toolkit-account-entry]')?.remove();
    return;
  }
  if (document.querySelector('[data-creator-toolkit-account-entry]')) return;
  const list = findFirst(ACCOUNT_NAV_SELECTORS);
  if (!list) return;
  const link = document.createElement('a');
  const item = document.createElement('li');
  item.dataset.creatorToolkitAccountEntry = 'true';
  item.setAttribute('role', 'presentation');
  link.href = PRIMARY_SETTINGS_URL;
  link.textContent = 'RoVex Settings';
  link.style.cssText =
    'display:block;padding:8px 10px;color:inherit;font:600 14px/20px "Builder Sans",Arial,sans-serif;';
  item.append(link);
  list.append(item);
}

export class RobloxSettingsIntegration {
  private mount?: SettingsMount;
  private observer?: MutationObserver;
  private queued = false;
  private stopped = false;
  private readonly onRouteChange = () => this.queueReconcile();

  start(): void {
    window.addEventListener('creator-toolkit:navigation', this.onRouteChange);
    window.addEventListener('popstate', this.onRouteChange);
    window.addEventListener('hashchange', this.onRouteChange);
    this.observer = new MutationObserver(() => this.queueReconcile());
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.reconcile();
  }

  private queueReconcile(): void {
    if (this.queued || this.stopped) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.reconcile();
    });
  }

  reconcile(): void {
    if (this.stopped) return;
    const accountRoute =
      location.hostname === 'www.roblox.com' && ROBLOX_ACCOUNT_PATH.test(location.pathname);
    if (!accountRoute) {
      this.mount?.unmount();
      this.mount = undefined;
      document.querySelector('[data-creator-toolkit-account-entry]')?.remove();
      return;
    }

    addAccountNavigationEntry();
    if (!isSettingsRoute()) {
      this.mount?.unmount();
      this.mount = undefined;
      return;
    }

    const target = findFirst(MOUNT_TARGET_SELECTORS);
    if (!target) {
      this.mount?.unmount();
      this.mount = undefined;
      return;
    }
    if (!this.mount) {
      this.mount = mountSettings(target);
      return;
    }
    if (!this.mount.host.isConnected || this.mount.target !== target) {
      this.mount.unmount();
      this.mount = mountSettings(target);
      return;
    }
    this.mount.sync();
  }

  stop(): void {
    this.stopped = true;
    window.removeEventListener('creator-toolkit:navigation', this.onRouteChange);
    window.removeEventListener('popstate', this.onRouteChange);
    window.removeEventListener('hashchange', this.onRouteChange);
    this.observer?.disconnect();
    this.mount?.unmount();
    document.querySelector('[data-creator-toolkit-account-entry]')?.remove();
  }
}
