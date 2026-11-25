import type { FeatureDefinition } from '../registry/types';
import { requestData, signedInUser } from '../shared/roblox-data';
import { ownedElement, watchDom } from './shared/live-dom';

const base = {
  category: 'roblox-navigation',
  defaultEnabled: false,
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'] }],
  settings: [],
} satisfies Partial<FeatureDefinition>;
const sidebar =
  '#left-navigation-container, #navigation, .left-nav, [data-testid="left-navigation"]';
const marker = 'data-rovex-sidebar-count';
const numberToken = /^[\p{N}\s.,\u066B\u066C]+(?:[KMBT])?\+?$/iu;
const counterPath =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:my\/messages|messages|users\/friends|my\/friends|friends|connections|my\/connections)\/?$/i;

export const quietSidebar: FeatureDefinition = {
  ...base,
  id: 'quiet-sidebar',
  title: 'Hide sidebar notification counts',
  description:
    'Hide unread message and friend request counts while keeping the sidebar links available.',
  availability: 'Roblox website sidebar.',
  activate({ signal }) {
    const style = ownedElement('style', 'quiet-sidebar', signal);
    style.textContent = `[${marker}] { display: none !important; }`;
    document.head.append(style);
    const marked = new Set<Element>();
    const refresh = () => {
      const matches = new Set<Element>();
      const links = document.querySelectorAll<HTMLAnchorElement>(
        `:is(${sidebar}) a[href], #nav-message a[href], #nav-friends a[href], a:is(#nav-message,#nav-friends)[href]`,
      );
      for (const link of links) {
        const url = new URL(link.href, location.href);
        const legacy = link.closest('#nav-message, #nav-friends');
        if (url.origin !== 'https://www.roblox.com' || (!legacy && !counterPath.test(url.pathname)))
          continue;
        const row =
          legacy ??
          link.closest('li, [role="listitem"], [data-testid*="nav-item" i]') ??
          (link.parentElement?.querySelectorAll('a[href]').length === 1 &&
          link.parentElement !== link.closest(sidebar)
            ? link.parentElement
            : link);
        for (const node of row.querySelectorAll('span, div, small, sup, strong, b, output')) {
          const text = node.textContent?.trim() ?? '';
          if (
            !text ||
            !/\p{N}/u.test(text) ||
            !numberToken.test(text) ||
            node.querySelector('a, button, svg, img') ||
            [...node.children].some((child) => numberToken.test(child.textContent?.trim() ?? ''))
          )
            continue;
          matches.add(node);
        }
      }
      for (const node of marked) if (!matches.has(node)) node.removeAttribute(marker);
      marked.clear();
      for (const node of matches) {
        node.setAttribute(marker, '');
        marked.add(node);
      }
    };
    watchDom(signal, refresh);
    signal.addEventListener(
      'abort',
      () => {
        for (const node of marked) node.removeAttribute(marker);
        marked.clear();
      },
      { once: true },
    );
  },
};

export const transactionsLink: FeatureDefinition = {
  ...base,
  id: 'my-transactions-link',
  title: 'My Transactions sidebar link',
  description: 'Open Roblox’s transaction history from the sidebar.',
  availability: 'Signed-in Roblox navigation.',
  activate({ signal }) {
    watchDom(signal, () => {
      if (!signedInUser()) return;
      const nav = [...document.querySelectorAll(sidebar)].find((root) =>
        root.querySelector('a[href*="/communities"], a[href*="/groups"]'),
      );
      if (!nav || nav.querySelector('a[href="/transactions"], a[href$="roblox.com/transactions"]'))
        return;
      const anchor = nav.querySelector<HTMLAnchorElement>(
        'a[href*="/communities"], a[href*="/groups"]',
      );
      const row = anchor?.closest('li, [role="listitem"]');
      if (!row || !nav.contains(row)) return;
      const item = ownedElement(
        row.tagName === 'LI' ? 'li' : 'div',
        'my-transactions-link',
        signal,
      );
      if (row.getAttribute('role') === 'listitem') item.setAttribute('role', 'listitem');
      item.className = row.className;
      const link = document.createElement('a');
      link.href = '/transactions';
      link.className = [...(anchor?.classList ?? [])]
        .filter((value) => !/active|selected/i.test(value))
        .join(' ');
      link.textContent = 'My Transactions';
      if (!link.className)
        link.style.cssText = 'display:block;padding:8px 12px;color:inherit;font-weight:600;';
      item.append(link);
      row.after(item);
    });
  },
};

export const fullRobuxBalance: FeatureDefinition = {
  ...base,
  id: 'full-robux-balance',
  title: 'More Robux digits',
  description: 'Show the exact Robux balance for the signed-in account when Roblox returns it.',
  availability: 'Signed-in Roblox header with an abbreviated balance.',
  activate({ signal }) {
    const edits = new Map<Text, { original: string; replacement: string; user: string }>();
    let balance: { user: string; amount: number } | undefined;
    let lastRequest = 0;
    let pending = false;
    const update = () => {
      const user = signedInUser();
      const targets = document.querySelectorAll(
        '#nav-robux-amount, #nav-robux-balance, [data-testid="navbar-robux-amount"]',
      );
      for (const [node, edit] of edits) {
        if (!node.isConnected || node.data !== edit.replacement) edits.delete(node);
        else if (user !== edit.user) {
          node.data = edit.original;
          edits.delete(node);
        }
      }
      if (!user || !targets.length) return;
      const nodes = [...targets]
        .flatMap((target) => [...target.childNodes])
        .filter((node): node is Text => node instanceof Text);
      const abbreviated = nodes.filter(
        (node) => /\p{N}[\p{N} .,\s]*[KMBT]\+?\s*$/iu.test(node.data) || edits.has(node),
      );
      if (!abbreviated.length) return;
      if ((!lastRequest || Date.now() - lastRequest > 30_000) && !pending && !document.hidden) {
        pending = true;
        lastRequest = Date.now();
        void requestData<{ robux?: number }>('balance', user)
          .then((result) => {
            if (Number.isSafeInteger(result?.robux) && result.robux! >= 0)
              balance = { user, amount: result.robux! };
          })
          .catch(() => undefined)
          .finally(() => {
            pending = false;
            if (!signal.aborted) update();
          });
      }
      if (!balance || balance.user !== user) return;
      for (const node of abbreviated) {
        const replacement = balance.amount.toLocaleString();
        if (node.data === replacement) continue;
        edits.set(node, { original: edits.get(node)?.original ?? node.data, replacement, user });
        node.data = replacement;
      }
    };
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update, { signal });
    watchDom(signal, update);
    signal.addEventListener(
      'abort',
      () => {
        clearInterval(timer);
        for (const [node, edit] of edits)
          if (node.data === edit.replacement) node.data = edit.original;
      },
      { once: true },
    );
  },
};

export const verifiedNavigationBadges: FeatureDefinition = {
  ...base,
  category: 'roblox-miscellaneous',
  id: 'verified-navigation-badges',
  title: 'Verified badges in navigation',
  description:
    'Show the signed-in account’s official verification status beside its name in navigation.',
  availability: 'Supported sidebar and header profile links.',
  activate({ signal }) {
    let checkedUser: string | undefined;
    let verified = false;
    const update = () => {
      const user = signedInUser();
      if (user !== checkedUser) {
        document
          .querySelectorAll('[data-creator-toolkit-owner="verified-navigation-badges"]')
          .forEach((badge) => badge.remove());
        checkedUser = user ?? undefined;
        verified = false;
        if (user)
          void requestData<{ id?: number; hasVerifiedBadge?: boolean }>('user', user)
            .then((data) => {
              if (signal.aborted || checkedUser !== user) return;
              verified = String(data?.id) === user && data?.hasVerifiedBadge === true;
              update();
            })
            .catch(() => undefined);
      }
      if (!verified || !user) return;
      for (const link of document.querySelectorAll<HTMLAnchorElement>(
        `:is(${sidebar}, header, #header, #navbar, #header-container) a[href*="/profile"]`,
      )) {
        if (
          !new RegExp(`/users/${user}/profile/?$`, 'i').test(
            new URL(link.href, location.href).pathname,
          ) ||
          link.origin !== 'https://www.roblox.com' ||
          link.querySelector(
            '[data-rblx-verified-badge-icon], [class*="verified-badge"], [data-creator-toolkit-owner="verified-navigation-badges"]',
          )
        )
          continue;
        const name =
          link.querySelector(
            '.text-header, .font-header-2, .text-overflow, [data-testid*="username" i]',
          ) ?? link;
        const badge = ownedElement('span', 'verified-navigation-badges', signal);
        badge.setAttribute('role', 'img');
        badge.setAttribute('aria-label', 'Roblox verified account');
        badge.title = 'Roblox verified account';
        badge.textContent = '✓';
        badge.style.cssText =
          'display:inline-grid;place-items:center;width:15px;height:15px;margin-inline-start:4px;border-radius:5px;background:#335fff;color:white;font:700 11px/1 system-ui;vertical-align:middle;';
        name.append(badge);
      }
    };
    watchDom(signal, update);
  },
};
