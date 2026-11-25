import type { FeatureDefinition } from '../../registry/types';
import { robloxApi, robloxId, signedInUser } from '../../api/roblox-data';
import { ownedElement, watchDom } from '../../core/live-dom';
import { verificationIcon } from '../../components/dom';
import { message } from '../../localization/messages';

const nav =
  'header, #header, #navbar, #header-container, #navigation, #left-navigation-container, .left-nav, [data-testid="left-navigation"], [data-testid="navigation-header"], [data-testid="navbar"]';
const nativeBadge =
  '[data-rblx-verified-badge-icon], [class*="verified-badge"], [data-testid*="verified-badge"]';
const owned = '[data-creator-toolkit-owner="verified-navigation-badges"]';
const nameSelector =
  '.text-header, .font-header-2, .text-overflow, [data-testid*="username" i], [data-testid="profile-name"]';

export const verifiedNavigationBadges: FeatureDefinition = {
  id: 'verified-navigation-badges',
  title: 'Verified badges in navigation',
  category: 'roblox-miscellaneous',
  description:
    'Show the signed-in account’s official verification status beside its name in navigation.',
  availability: 'Supported sidebar and header profile links.',
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'] }],
  defaultEnabled: false,
  settings: [],
  activate({ signal }) {
    const root = document.documentElement;
    const status = (value: string) => {
      root.dataset.rovexVerifiedStatus = value;
    };
    const clear = () => document.querySelectorAll(owned).forEach((badge) => badge.remove());
    let fallback: string | undefined;
    let attemptedSelf = false;
    let lastMetadata = signedInUser();
    let requested: string | undefined;
    let names: Set<string> | undefined;
    const update = () => {
      const metadata = signedInUser();
      if (metadata !== lastMetadata) {
        lastMetadata = metadata;
        fallback = undefined;
        attemptedSelf = false;
      }
      const id = metadata ?? fallback;
      if (!id) {
        if (requested) {
          clear();
          requested = undefined;
          names = undefined;
        }
        status('account-unavailable');
        if (!attemptedSelf && document.querySelector(nav)) {
          attemptedSelf = true;
          void robloxApi('self', '', { signal })
            .then((data) => {
              if (signal.aborted || signedInUser()) return;
              fallback = robloxId(data?.id) ?? undefined;
              update();
            })
            .catch(() => undefined);
        }
        return;
      }
      if (id !== requested) {
        clear();
        requested = id;
        names = undefined;
        status('checking');
        void robloxApi('user', id, { signal })
          .then((data) => {
            if (signal.aborted || requested !== id) return;
            if (robloxId(data?.id) !== id) {
              status('account-mismatch');
              return;
            }
            if (data.hasVerifiedBadge !== true) {
              status('not-verified');
              return;
            }
            names = new Set(
              [data.name, data.displayName].flatMap((name) => (name ? [name.toLowerCase()] : [])),
            );
            update();
          })
          .catch(() => {
            if (!signal.aborted && requested === id) status('verification-unavailable');
          });
      }
      if (!names) return;
      let rendered = false;
      const displayed = new Set<Element>();
      for (const link of document.querySelectorAll<HTMLAnchorElement>(`:is(${nav}) a[href]`)) {
        const url = new URL(link.href);
        if (url.origin !== 'https://www.roblox.com') continue;
        const path = url.pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/(?:users|my)\/)/i, '');
        const isSpecific = new RegExp(`^/users/${id}/profile/?$`, 'i').test(path);
        if (!isSpecific && !/^\/my\/profile\/?$/i.test(path)) continue;
        const existing = link.querySelector(owned);
        if (link.querySelector(nativeBadge)) {
          existing?.remove();
          rendered = true;
          continue;
        }
        if (existing) {
          displayed.add(existing);
          rendered = true;
          continue;
        }
        const label = link.querySelector(nameSelector) ?? link;
        const text = label.textContent?.trim().replace(/^@/, '').toLowerCase();
        if (!text || (!isSpecific && names.size && !names.has(text))) continue;
        const badge = ownedElement('span', 'verified-navigation-badges', signal);
        badge.append(verificationIcon(message('verified_account', 'Roblox verified account')));
        label.append(badge);
        displayed.add(badge);
        rendered = true;
      }
      document.querySelectorAll(owned).forEach((badge) => {
        if (!displayed.has(badge)) badge.remove();
      });
      status(rendered ? 'verified' : 'navigation-label-unavailable');
    };
    signal.addEventListener(
      'abort',
      () => {
        delete root.dataset.rovexVerifiedStatus;
      },
      { once: true },
    );
    watchDom(signal, update);
  },
};
