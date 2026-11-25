import type { FeatureDefinition } from '../registry/types';
import { getFeature, setFeature } from '../storage/chrome-storage';
import styles from './page-library.css?inline';

type Entry = { path: string; title: string };
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
    entries.set(path, { path, title: entry.title.trim().slice(0, 120) || path });
    if (entries.size === limit) break;
  }
  return [...entries.values()];
}

function createLibrary(
  mode: 'saved-experiences' | 'saved-marketplace' | 'recent-experiences',
): FeatureDefinition {
  const recent = mode === 'recent-experiences';
  const items = mode === 'saved-marketplace';
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
    settings: [],
    dataKeys: ['entries'],
    supportedSites: ['roblox'],
    routes: [{ hostnames, path: page }, ...(!items ? [{ hostnames, path: home }] : [])],
    async activate({ route, signal }) {
      const path = canonicalLibraryPath(route.pathname, page);
      const target = document.querySelector(
        path
          ? items
            ? '#item-container, [data-testid="item-details"]'
            : '.game-main-content, [data-testid="experience-header"]'
          : '#HomeContainer, [data-testid="home-page"]',
      );
      if (!target) return { isHealthy: () => false };

      const heading = target.querySelector('h1, h2, .game-name');
      const label =
        heading?.textContent?.trim() ||
        document.title.replace(/\s*[|–-]\s*(?:Play on )?Roblox.*$/i, '').trim();
      const current = path ? { path, title: label.slice(0, 120) || path } : null;
      if (recent && current) {
        const record = await getFeature(feature);
        const entries = readEntries(record.data?.entries, page);
        if (!signal.aborted && entries[0]?.path !== current.path) {
          await setFeature(feature, {
            ...record,
            data: {
              entries: [current, ...entries.filter((entry) => entry.path !== current.path)].slice(
                0,
                limit,
              ),
            },
          });
        }
      }
      if (signal.aborted || (recent && path)) return;
      const record = await getFeature(feature);
      if (signal.aborted || !target.isConnected) return { isHealthy: () => false };
      const entries = readEntries(record.data?.entries, page);
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
              const latest = await getFeature(feature);
              if (!signal.aborted) {
                await setFeature(feature, {
                  ...latest,
                  data: {
                    entries: update(readEntries(latest.data?.entries, page)).slice(0, limit),
                  },
                });
              }
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
        details.append(
          button('Save this page', (list) => [
            current,
            ...list.filter((entry) => entry.path !== current.path),
          ]),
        );
      }
      if (entries.length) {
        const list = document.createElement('ul');
        for (const entry of entries) {
          const row = document.createElement('li');
          const link = document.createElement('a');
          link.href = entry.path;
          link.textContent = entry.title;
          row.append(link);
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
      return { isHealthy: () => host.isConnected, deactivate: () => host.remove() };
    },
  };
  return feature;
}

export const pageLibraries = [
  createLibrary('saved-experiences'),
  createLibrary('saved-marketplace'),
  createLibrary('recent-experiences'),
];
