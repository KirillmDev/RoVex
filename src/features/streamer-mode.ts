import type { FeatureDefinition } from '../registry';
import { ownedElement, watchDom } from '../core/live-dom';

const hostnames = ['www.roblox.com'];
const accountPath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?my\/account\/?$/i;
const maskBalance = 'data-rovex-mask-balances';
const revealBalance = 'data-rovex-reveal-robux';
const maskAccount = 'data-rovex-mask-account';

export const streamerMode: FeatureDefinition = {
  id: 'streamer-mode',
  category: 'privacy',
  title: 'Streamer Mode',
  description:
    'Visually shield sensitive account panels and header balances in this browser. Preview your capture before sharing.',
  availability: 'Roblox account settings and supported balance displays in the site header.',
  defaultEnabled: false,
  supportedSites: ['roblox'],
  routes: [{ hostnames }],
  settings: [
    {
      key: 'hide-account',
      kind: 'boolean',
      label: 'Shield sensitive account settings',
      default: true,
    },
    {
      key: 'hide-balance',
      kind: 'boolean',
      label: 'Hide Robux and currency estimates',
      default: true,
    },
    { key: 'allow-reveal', kind: 'boolean', label: 'Allow temporary Robux reveal', default: false },
  ],
  activate({ record, signal }) {
    const root = document.documentElement;
    const style = ownedElement('style', 'streamer-mode', signal);
    style.textContent = `
      :root[${maskAccount}] main :is(.tab-content, [role="tabpanel"]):not(:has(creator-toolkit-settings-root)):not(creator-toolkit-settings-root *) {
        visibility: hidden !important;
      }
      :root[${maskBalance}] #header :is([data-testid*="robux-cash" i], [class*="robux-to-usd" i], [class*="robux-to-cash" i], #nav-robux-usd, [data-rovex-fiat-estimate]) {
        visibility: hidden !important;
      }
      :root[${maskBalance}]:not([${revealBalance}]) :is(#nav-robux-amount, #nav-robux-balance,
        [data-testid="navbar-robux-amount"], #header [aria-label="Robux" i], #header [aria-label^="Robux " i]) {
        visibility: hidden !important;
      }
      [data-rovex-privacy-control] { border: 1px solid var(--color-stroke-default, GrayText); background: var(--color-surface-100, Canvas); color: inherit; border-radius: 8px; padding: 4px 8px; }
      [data-rovex-account-shield] { margin: 8px 0; padding: 12px; color: var(--color-content-emphasis, CanvasText); }
    `;
    document.head.append(style);
    const clearReveal = () => root.removeAttribute(revealBalance);
    function update() {
      const account =
        accountPath.test(location.pathname) &&
        record.options['hide-account'] === true &&
        !new URLSearchParams(location.search).has('creatorToolkit') &&
        (!location.hash || /^#!\/(?:info|security)(?:\/|$)/i.test(location.hash));
      if (root.hasAttribute(maskAccount) !== account) root.toggleAttribute(maskAccount, account);
      const masked = record.options['hide-balance'] === true;
      if (root.hasAttribute(maskBalance) !== masked) root.toggleAttribute(maskBalance, masked);
      const notice = document.querySelector('[data-rovex-account-shield]');
      const panel = document.querySelector('main .tab-content, main [role="tabpanel"]');
      if (!account || !panel) notice?.remove();
      else if (!notice) {
        const text = ownedElement('p', 'streamer-mode', signal);
        text.dataset.rovexAccountShield = '';
        text.setAttribute('role', 'status');
        text.textContent = 'Streamer Mode is shielding this account settings panel.';
        panel.before(text);
      }
      const gear = document.querySelector('#header button[aria-label="Robux" i], #nav-robux');
      const control = document.querySelector('[data-rovex-privacy-control]');
      if (!masked || record.options['allow-reveal'] !== true || !gear) control?.remove();
      else if (!control) {
        const button = ownedElement('button', 'streamer-mode', signal);
        button.dataset.rovexPrivacyControl = '';
        button.type = 'button';
        button.textContent = 'Reveal Robux';
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener(
          'click',
          () => {
            const revealed = root.toggleAttribute(revealBalance);
            button.setAttribute('aria-pressed', String(revealed));
            button.textContent = revealed ? 'Hide Robux' : 'Reveal Robux';
          },
          { signal },
        );
        const wrapper = gear.closest('li');
        if (wrapper) {
          const row = ownedElement('li', 'streamer-mode', signal);
          row.append(button);
          wrapper.after(row);
        } else gear.after(button);
      }
      const button = document.querySelector('[data-rovex-privacy-control]');
      if (
        button &&
        !root.hasAttribute(revealBalance) &&
        button.getAttribute('aria-pressed') === 'true'
      ) {
        button.setAttribute('aria-pressed', 'false');
        button.textContent = 'Reveal Robux';
      }
    }
    const navigate = () => {
      clearReveal();
      update();
    };
    for (const event of ['hashchange', 'popstate', 'creator-toolkit:navigation', 'pagehide'])
      window.addEventListener(event, navigate, { signal });
    watchDom(signal, update);
    signal.addEventListener(
      'abort',
      () => {
        for (const attribute of [maskAccount, maskBalance, revealBalance])
          root.removeAttribute(attribute);
      },
      { once: true },
    );
  },
};
