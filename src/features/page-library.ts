import type { FeatureDefinition } from '../registry/types';
import { getFeature, setFeature } from '../storage/chrome-storage';
import styles from './page-library.css?inline';
import { marketplaceHeading } from './marketplace/item-page';
import { experienceCardLinks, experienceCardWrapper } from './experiences/cards';
import { ownedElement, watchDom } from '../core/live-dom';

type Entry = { path: string; title: string; category?: string };
const hostnames = ['www.roblox.com'];
const prefix = '(?:[a-z]{2}(?:-[a-z]{2})?/)?';
const experience = new RegExp(`^/${prefix}(games)/(\\d+)(?:/|$)`, 'i');
const marketplace = new RegExp(`^/${prefix}(catalog|bundles)/(\\d+)(?:/|$)`, 'i');
const home = new RegExp(`^/${prefix}home/?$`, 'i');
const limit = 30;

export function canonicalLibraryPath(path: string, route: RegExp): string | null {
  const match = route.exec(path);
  return match ? `/${match[1].toLowerCase()}/${match[2]}` : null;
}

function readEntries(value: unknown, route: RegExp): Entry[] {
  if (!Array.isArray(value)) return [];
  const entries = new Map<string, Entry>();
  for (const entry of value) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.title !== 'string') continue;
    const path = canonicalLibraryPath(entry.path, route);
    if (!path || entries.has(path)) continue;
    const category = typeof entry.category === 'string' ? entry.category.trim().slice(0, 48) : '';
    entries.set(path, {
      path,
      title: entry.title.trim().slice(0, 120) || path,
      ...(category ? { category } : {}),
    });
    if (entries.size === limit) break;
  }
  return [...entries.values()];
}

function mountBookmarkActions(
  signal: AbortSignal,
  entries: Entry[],
  updateEntries: (update: (entries: Entry[]) => Entry[]) => Promise<void>,
) {
  const style = ownedElement('style', 'saved-experiences', signal);
  style.textContent = `
    [data-rovex-card-bookmark] {
      display: block; width: 100%; min-height: 32px; margin-block-start: 4px;
      border: 1px solid var(--color-stroke-default, GrayText); border-radius: 8px;
      color: inherit; background: var(--color-surface-100, ButtonFace); font: inherit; cursor: pointer;
    }
    [data-rovex-card-bookmark]:hover { background: var(--color-action-standard-background, ButtonFace); }
    [data-rovex-card-bookmark]:focus-visible { outline: 2px solid var(--color-system-emphasis, Highlight); }
  `;
  document.head.append(style);
  const cards = new Map<Element, { path: string; action: HTMLButtonElement }>();
  const saved = new Set(entries.map((entry) => entry.path));
  watchDom(signal, () => {
    const present = new Set<Element>();
    for (const link of document.querySelectorAll<HTMLAnchorElement>(experienceCardLinks)) {
      const url = new URL(link.href);
      const path =
        url.origin === 'https://www.roblox.com' && canonicalLibraryPath(url.pathname, experience);
      const card = path && experienceCardWrapper(link);
      if (!card || !path || present.has(card)) continue;
      present.add(card);
      const existing = cards.get(card);
      if (existing?.path === path && existing.action.isConnected) continue;
      existing?.action.remove();
      const action = ownedElement('button', 'saved-experiences', signal);
      action.dataset.rovexCardBookmark = '';
      action.type = 'button';
      action.textContent = saved.has(path) ? 'Remove bookmark' : 'Bookmark';
      const title = (link.getAttribute('aria-label') || link.textContent?.trim() || path).slice(
        0,
        120,
      );
      action.setAttribute('aria-label', `${action.textContent}: ${title}`);
      action.addEventListener(
        'click',
        async () => {
          action.disabled = true;
          try {
            await updateEntries((latest) =>
              latest.some((entry) => entry.path === path)
                ? latest.filter((entry) => entry.path !== path)
                : [{ path, title }, ...latest],
            );
          } catch {
            action.textContent = 'Retry bookmark';
            action.setAttribute('aria-label', `Retry bookmark: ${title}`);
          } finally {
            action.disabled = false;
          }
        },
        { signal },
      );
      card.append(action);
      cards.set(card, { path, action });
    }
    for (const [card, { action }] of cards) {
      if (present.has(card)) continue;
      action.remove();
      cards.delete(card);
    }
  });
}

function createLibrary(
  mode: 'saved-experiences' | 'saved-marketplace' | 'recent-experiences',
): FeatureDefinition {
  const recent = mode === 'recent-experiences';
  const items = mode === 'saved-marketplace';
  const bookmarks = mode === 'saved-experiences';
  const page = items ? marketplace : experience;
  const title = items
    ? 'Marketplace wishlist'
    : recent
      ? 'Recently viewed experiences'
      : 'Saved experiences';
  let expandedPage: string | undefined;

  const feature: FeatureDefinition = {
    id: mode,
    title,
    category: items ? 'marketplace' : 'experiences',
    description: recent
      ? 'Keep a local list of experience pages you view. Open or clear the list from Home.'
      : 'Save pages to a private list in this browser and reopen them later.',
    availability: items
      ? 'Marketplace item and bundle pages.'
      : 'Experience pages and Roblox Home.',
    defaultEnabled: false,
    settings: bookmarks
      ? [
          {
            key: 'card-actions',
            kind: 'boolean',
            label: 'Show bookmark buttons on experience cards',
            default: false,
          },
        ]
      : [],
    dataKeys: ['entries'],
    supportedSites: ['roblox'],
    routes: [
      { hostnames, path: page },
      { hostnames, path: items ? new RegExp(`^/${prefix}catalog/?$`, 'i') : home },
      ...(bookmarks ? [{ hostnames }] : []),
    ],
    async activate({ route, signal, record }) {
      const path = canonicalLibraryPath(route.pathname, page);
      const entries = readEntries(record.data?.entries, page);
      const updateEntries = async (update: (entries: Entry[]) => Entry[]) => {
        const write = async () => {
          if (signal.aborted) return;
          const latest = await getFeature(feature);
          if (signal.aborted || !latest.enabled) return;
          const before = readEntries(latest.data?.entries, page);
          const next = update(before).slice(0, limit);
          if (JSON.stringify(before) !== JSON.stringify(next))
            await setFeature(feature, { ...latest, data: { entries: next } });
        };
        if (navigator.locks) await navigator.locks.request(`rovex-library-${mode}`, write);
        else await write();
      };
      if (bookmarks && record.options['card-actions'] === true)
        mountBookmarkActions(signal, entries, updateEntries);
      if (bookmarks && !path && !home.test(route.pathname)) return;
      const itemHeading = items && path ? marketplaceHeading() : null;
      const target =
        itemHeading?.parentElement ??
        document.querySelector(
          path
            ? items
              ? '#item-container, [data-testid="item-details"]'
              : '.game-main-content, [data-testid="experience-header"]'
            : items
              ? 'main, [role="main"]'
              : '#HomeContainer, [data-testid="home-page"]',
        );
      if (!target) return { isHealthy: () => false };

      const heading = itemHeading ?? target.querySelector('h1, h2, .game-name');
      const label =
        heading?.textContent?.trim() ||
        document.title.replace(/\s*[|–-]\s*(?:Play on )?Roblox.*$/i, '').trim();
      const current = path ? { path, title: label.slice(0, 120) || path } : null;
      if (recent && current) {
        await updateEntries((entries) =>
          entries[0]?.path === current.path
            ? entries
            : [current, ...entries.filter((entry) => entry.path !== current.path)],
        );
      }
      if (signal.aborted || (recent && path)) return;
      const host = document.createElement('span');
      host.dataset.creatorToolkitOwner = mode;
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = styles;
      const details = document.createElement('details');
      details.open = expandedPage === route.pathname;
      details.addEventListener(
        'toggle',
        () => {
          if (!signal.aborted) expandedPage = details.open ? route.pathname : undefined;
        },
        { signal },
      );
      const summary = document.createElement('summary');
      summary.textContent = `${title} (${entries.length})`;
      details.append(summary);

      const button = (label: string, update: (entries: Entry[]) => Entry[]) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.textContent = label;
        element.addEventListener(
          'click',
          async () => {
            element.disabled = true;
            try {
              await updateEntries(update);
              element.disabled = false;
            } catch {
              element.textContent = 'Could not save. Retry';
              element.disabled = false;
            }
          },
          { signal },
        );
        return element;
      };
      if (current && !entries.some((entry) => entry.path === current.path)) {
        const category = document.createElement('input');
        category.type = 'text';
        category.maxLength = 48;
        if (!items && !recent) {
          const label = document.createElement('label');
          label.append('Bookmark category (optional) ', category);
          details.append(label);
        }
        details.append(
          button('Save this page', (list) => [
            { ...current, ...(category.value.trim() ? { category: category.value.trim() } : {}) },
            ...list.filter((entry) => entry.path !== current.path),
          ]),
        );
      }
      if (entries.length) {
        const list = document.createElement('ul');
        const categories = [
          ...new Set(entries.flatMap((entry) => (entry.category ? [entry.category] : []))),
        ].sort();
        const filter = document.createElement('select');
        if (!items && !recent && categories.length) {
          filter.add(new Option('All categories', ''));
          categories.forEach((category) => filter.add(new Option(category, category)));
          const label = document.createElement('label');
          label.append('Bookmark category ', filter);
          details.append(label);
          filter.addEventListener(
            'change',
            () => {
              for (const row of list.children) {
                if (row instanceof HTMLElement)
                  row.hidden = Boolean(filter.value && row.dataset.category !== filter.value);
              }
            },
            { signal },
          );
        }
        for (const entry of entries) {
          const row = document.createElement('li');
          row.dataset.category = entry.category ?? '';
          const link = document.createElement('a');
          link.href = entry.path;
          link.textContent = entry.title;
          row.append(link);
          if (entry.category) {
            const category = document.createElement('span');
            category.textContent = entry.category;
            row.append(category);
          }
          if (!recent)
            row.append(
              button(`Remove ${entry.title}`, (list) =>
                list.filter((item) => item.path !== entry.path),
              ),
            );
          list.append(row);
        }
        details.append(list);
        if (recent) details.append(button('Clear history', () => []));
      } else {
        const empty = document.createElement('p');
        empty.textContent = 'No pages yet.';
        details.append(empty);
      }
      shadow.append(style, details);
      if (heading) heading.after(host);
      else target.prepend(host);
      return {
        isHealthy: () => host.isConnected && (!heading || heading.isConnected),
        deactivate: () => host.remove(),
      };
    },
  };
  return feature;
}

export const pageLibraries = [
  createLibrary('saved-experiences'),
  createLibrary('saved-marketplace'),
  createLibrary('recent-experiences'),
];
