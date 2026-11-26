import type { FeatureDefinition } from '../../registry';
import { ownedElement, watchDom } from '../../core/live-dom';
import { SIDEBAR_COMPACT_KEY as key } from '../../storage/schema';

const sidebar = '#left-navigation-container .left-nav';

export const collapseSidebar: FeatureDefinition = {
  id: 'collapse-sidebar',
  category: 'roblox-navigation',
  title: 'Collapse Sidebar',
  description: 'Switch between the full desktop sidebar and an icon-only rail.',
  availability: 'Roblox desktop sidebar with an expanded navigation drawer.',
  defaultEnabled: false,
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'] }],
  settings: [],
  activate({ signal }) {
    const root = document.documentElement;
    const marker = 'data-rovex-compact-sidebar';
    const control = 'data-rovex-sidebar-toggle';
    let collapsed = false;
    const style = ownedElement('style', 'collapse-sidebar', signal);
    style.textContent = `
      [${control}] { display: none; }
      @media (min-width: 1200px) {
        [${control}] {
          display: grid; place-items: center; margin: 4px 16px; width: 40px; height: 40px;
          font: 700 24px/1 system-ui; border: 0; border-radius: 8px; color: inherit;
          background: var(--color-action-standard-background, ButtonFace); cursor: pointer;
        }
        [${control}]:hover { background: var(--color-state-hover, ButtonFace); }
        [${control}]:focus-visible { outline: 2px solid currentColor; }
        :root[${marker}] ${sidebar} { width: 72px !important; overflow-x: hidden; }
        :root[${marker}] ${sidebar} nav { width: 100% !important; box-sizing: border-box; padding-inline: 8px; }
        :root[${marker}] ${sidebar} nav a { position: relative; justify-content: center; gap: 0; padding-inline: 0 !important; }
        :root[${marker}] ${sidebar} nav a > :not([role="presentation"]):not(.size-1000):not([data-rovex-transaction-icon]) {
          position: absolute; width: 1px; height: 1px; clip-path: inset(50%);
        }
        :root[${marker}] ${sidebar} nav a > span:has(.foundation-web-status-indicator:not([data-rovex-sidebar-count])) {
          position: absolute; inset: 1px 1px auto auto; clip-path: none; width: auto; height: auto; padding: 0;
        }
        :root[${marker}] main.container-main { margin-inline-start: 72px !important; }
      }
    `;
    document.head.append(style);
    const render = () => {
      const drawer = document.querySelector(sidebar);
      const nav = drawer?.querySelector('nav');
      if (!nav?.querySelector('a > .size-1000')) {
        root.removeAttribute(marker);
        return;
      }
      let button = drawer?.querySelector<HTMLButtonElement>(`[${control}]`);
      if (!button) {
        button = ownedElement('button', 'collapse-sidebar', signal);
        button.type = 'button';
        button.setAttribute(control, '');
        button.addEventListener(
          'click',
          () => {
            collapsed = !collapsed;
            render();
            void chrome.storage.local.set({ [key]: collapsed });
          },
          { signal },
        );
        nav.before(button);
      }
      const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
      if (button.title !== label) {
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-expanded', String(!collapsed));
        button.textContent = collapsed ? '›' : '‹';
      }
      if (root.hasAttribute(marker) !== collapsed) root.toggleAttribute(marker, collapsed);
    };
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (key in changes) {
        collapsed = changes[key].newValue === true;
        render();
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    void chrome.storage.local
      .get(key)
      .then((values) => {
        if (!signal.aborted) {
          collapsed = values[key] === true;
          render();
        }
      })
      .catch(() => undefined);
    watchDom(signal, render);
    signal.addEventListener(
      'abort',
      () => {
        root.removeAttribute(marker);
        chrome.storage.onChanged.removeListener?.(onStorage);
      },
      { once: true },
    );
  },
};
