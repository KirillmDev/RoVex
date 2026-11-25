import type { FeatureDefinition } from '../registry/types';
import { experiencePath, requestData, robloxId, universeForPlace } from '../shared/roblox-data';
import { ownedElement, watchDom } from './shared/live-dom';
import styles from './experience-store.css?inline';

type Item = { id: string; name: string; price?: number; onSale?: boolean; icon?: string };
type Filter = 'all' | 'on' | 'off';
const FILTER_EVENT = 'rovex:store-filter';
const hidden = 'data-rovex-sale-hidden';
const modes = new WeakMap<Element, Filter>();
const storeSelector = '.tab-pane.store, #store-tab, [data-testid="experience-store-tab-panel"]';
const owner = (id: string) => `[data-creator-toolkit-owner="${id}"]`;

export function matchesStoreFilter(mode: Filter, onSale?: boolean): boolean {
  return mode === 'all' || onSale === undefined || onSale === (mode === 'on');
}

function normalizeItem(value: unknown): Item | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = robloxId(row.id ?? row.productId ?? row.ProductId);
  const name = row.displayName ?? row.name ?? row.Name;
  if (!id || typeof name !== 'string' || !name.trim()) return null;
  const price = row.priceInRobux ?? row.price ?? row.PriceInRobux;
  const sale = row.isForSale ?? row.IsForSale;
  return {
    id,
    name: name.trim(),
    price:
      typeof price === 'number' && Number.isSafeInteger(price) && price >= 0 ? price : undefined,
    onSale: typeof sale === 'boolean' ? sale : undefined,
    icon:
      robloxId(row.displayIconImageAssetId ?? row.iconImageAssetId ?? row.IconImageAssetId) ??
      undefined,
  };
}

async function loadItems(kind: 'products' | 'passes', place: string, signal: AbortSignal) {
  const universe = await universeForPlace(place);
  const items = new Map<string, Item>();
  let cursor = '';
  const visited = new Set<string>();
  for (let page = 0; page < 5 && !signal.aborted; page++) {
    const result = await requestData<{
      developerProducts?: unknown[];
      gamePasses?: unknown[];
      nextPageCursor?: string;
      nextPageToken?: string;
    }>(kind, universe, cursor);
    const rows = kind === 'products' ? result.developerProducts : result.gamePasses;
    if (!Array.isArray(rows)) throw new Error('Unexpected Store response');
    for (const row of rows) {
      const item = normalizeItem(row);
      if (item) items.set(item.id, item);
    }
    cursor = (kind === 'products' ? result.nextPageCursor : result.nextPageToken) || '';
    if (!cursor) break;
    if (visited.has(cursor)) break;
    visited.add(cursor);
  }
  return { universe, items, partial: Boolean(cursor) };
}

function makeSection(title: string): {
  root: ShadowRoot;
  note: HTMLParagraphElement;
  grid: HTMLUListElement;
  host: HTMLElement;
} {
  const host = document.createElement('section');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const heading = document.createElement('h3');
  heading.textContent = title;
  const note = document.createElement('p');
  note.setAttribute('role', 'status');
  const grid = document.createElement('ul');
  root.append(style, heading, note, grid);
  return { root, note, grid, host };
}

function card(item: Item, href: string): HTMLLIElement {
  const row = document.createElement('li');
  const link = document.createElement('a');
  link.href = href;
  link.textContent = item.name;
  const price = document.createElement('small');
  price.textContent =
    item.onSale === false
      ? 'Off sale'
      : item.price !== undefined
        ? `${item.price.toLocaleString()} Robux`
        : 'Price unavailable';
  row.append(link, price);
  return row;
}

const base = {
  category: 'experiences',
  defaultEnabled: false,
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'], path: experiencePath }],
  settings: [],
} satisfies Partial<FeatureDefinition>;

export const developerProducts: FeatureDefinition = {
  ...base,
  id: 'view-developer-products',
  title: 'View developer products',
  description:
    'Browse publicly listed developer products and their available prices in the experience Store.',
  availability: 'Experience Store tabs with publicly listed products.',
  activate({ route, signal }) {
    const place = experiencePath.exec(route.pathname)?.[1];
    if (!place) return;
    let loaded: ReturnType<typeof loadItems> | undefined;
    watchDom(signal, () => {
      const store = document.querySelector(storeSelector);
      if (
        !store ||
        store.closest('[hidden], [aria-hidden="true"]') ||
        !store.getClientRects().length ||
        store.querySelector(
          `#rbx-developer-products, .rovalra-dev-products, ${owner('view-developer-products')}`,
        )
      )
        return;
      const section = makeSection('Developer products');
      section.host.dataset.creatorToolkitOwner = 'view-developer-products';
      section.note.textContent = 'Loading developer products…';
      store.append(section.host);
      signal.addEventListener('abort', () => section.host.remove(), { once: true });
      loaded ??= loadItems('products', place, signal);
      void loaded
        .then(async ({ universe, items, partial }) => {
          if (signal.aborted || !section.host.isConnected) return;
          const rows = new Map<string, HTMLLIElement>();
          for (const item of items.values()) {
            const row = card(item, `/developer-product/${universe}/product/${item.id}`);
            rows.set(item.id, row);
            section.grid.append(row);
          }
          const render = () => {
            const mode = modes.get(store) ?? 'all';
            let visible = 0;
            for (const item of items.values()) {
              const show = matchesStoreFilter(mode, item.onSale);
              rows.get(item.id)!.hidden = !show;
              if (show) visible++;
            }
            section.note.textContent = !items.size
              ? 'No publicly listed developer products.'
              : !visible
                ? 'No products match this filter.'
                : [
                    partial ? 'Showing the first available pages.' : '',
                    mode !== 'all' && [...items.values()].some((item) => item.onSale === undefined)
                      ? 'Products with unknown sale status remain visible.'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
          };
          store.addEventListener(FILTER_EVENT, render, { signal });
          render();
          const icons = [
            ...new Set([...items.values()].flatMap((item) => (item.icon ? [item.icon] : []))),
          ];
          for (
            let offset = 0;
            offset < icons.length && !signal.aborted && section.host.isConnected;
            offset += 100
          ) {
            const thumbs = await requestData<{ data?: { targetId: number; imageUrl?: string }[] }>(
              'icons',
              icons.slice(offset, offset + 100).join(','),
            ).catch(() => null);
            for (const thumb of thumbs?.data ?? []) {
              if (
                signal.aborted ||
                !thumb.imageUrl ||
                !/^https:\/\/[a-z0-9-]+\.rbxcdn\.com\//i.test(thumb.imageUrl)
              )
                continue;
              for (const item of items.values())
                if (item.icon === String(thumb.targetId)) {
                  const img = document.createElement('img');
                  img.alt = '';
                  img.loading = 'lazy';
                  img.src = thumb.imageUrl;
                  rows.get(item.id)?.prepend(img);
                }
            }
          }
        })
        .catch(() => {
          if (!signal.aborted)
            section.note.textContent = 'Developer products are temporarily unavailable.';
        });
    });
  },
};

export const storeSaleFilter: FeatureDefinition = {
  ...base,
  id: 'store-sale-filter',
  title: 'Store sale filter',
  description: 'Filter game passes and developer products by known sale status.',
  availability: 'Experience Store tabs with public sale information.',
  activate({ route, signal }) {
    const place = experiencePath.exec(route.pathname)?.[1];
    if (!place) return;
    let result: ReturnType<typeof loadItems> | undefined;
    let clean: (() => void) | undefined;
    let activeStore: Element | undefined;
    const style = ownedElement('style', 'store-sale-filter-style', signal);
    style.textContent = `[${hidden}] { display: none !important; }`;
    document.head.append(style);
    const update = () => {
      const store = document.querySelector(storeSelector);
      if (
        !store ||
        !store.getClientRects().length ||
        store.querySelector('.rovalra-store-sale-filter')
      )
        return;
      if (activeStore === store && store.querySelector(owner('store-sale-filter'))) return;
      clean?.();
      activeStore = store;
      const control = ownedElement('label', 'store-sale-filter', signal);
      control.textContent = 'Sale status ';
      control.style.cssText = 'display:block;margin:8px 0;';
      const select = document.createElement('select');
      select.className = 'input-field';
      for (const [value, title] of [
        ['all', 'All'],
        ['on', 'On sale'],
        ['off', 'Off sale'],
      ]) {
        select.add(new Option(title, value));
      }
      control.append(select);
      store.prepend(control);
      const listing = makeSection('Public game passes');
      let data: Awaited<ReturnType<typeof loadItems>> | undefined;
      let error = false;
      let selected: Filter = 'all';
      const apply = () => {
        if (signal.aborted || activeStore !== store || !control.isConnected) return;
        const native = new Set<string>();
        for (const row of store.querySelectorAll(
          '#rbx-passes-container > li, [data-testid="game-pass-card"]',
        )) {
          const href = row.querySelector('a[href*="/game-pass/"]')?.getAttribute('href');
          const id = robloxId(
            row.getAttribute('data-game-pass-id') ?? /\/game-pass\/(\d+)/.exec(href ?? '')?.[1],
          );
          if (id) native.add(id);
          const explicit = row.getAttribute('data-is-for-sale');
          const sale =
            explicit === 'true'
              ? true
              : explicit === 'false'
                ? false
                : id
                  ? data?.items.get(id)?.onSale
                  : undefined;
          row.toggleAttribute(hidden, !matchesStoreFilter(selected, sale));
        }
        if (selected === 'all') {
          listing.host.remove();
          return;
        }
        if (!listing.host.isConnected) control.after(listing.host);
        const extra = [...(data?.items.values() ?? [])].filter(
          (item) =>
            !native.has(item.id) &&
            item.onSale !== undefined &&
            matchesStoreFilter(selected, item.onSale),
        );
        const listKey = extra.map(({ id }) => id).join(',');
        if (listing.grid.dataset.ids !== listKey) {
          listing.grid.dataset.ids = listKey;
          listing.grid.replaceChildren(...extra.map((item) => card(item, `/game-pass/${item.id}`)));
        }
        const message = error
          ? 'Public sale data is unavailable. Cards with unknown status remain visible.'
          : data
            ? `${data.partial ? 'Showing the first available pages. ' : ''}Cards with unknown status remain visible.`
            : 'Loading public sale data…';
        if (listing.note.textContent !== message) listing.note.textContent = message;
      };
      const change = () => {
        selected = select.value as Filter;
        modes.set(store, selected);
        store.dispatchEvent(new Event(FILTER_EVENT));
        if (selected !== 'all' && !result) result = loadItems('passes', place, signal);
        if (selected !== 'all' && !data && !error)
          void result
            ?.then((value) => {
              data = value;
              apply();
            })
            .catch(() => {
              error = true;
              apply();
            });
        apply();
      };
      select.addEventListener('change', change, { signal });
      const stopApplying = watchDom(signal, apply);
      clean = () => {
        stopApplying();
        control.remove();
        listing.host.remove();
        store.querySelectorAll(`[${hidden}]`).forEach((row) => row.removeAttribute(hidden));
        modes.delete(store);
        store.dispatchEvent(new Event(FILTER_EVENT));
      };
    };
    watchDom(signal, update);
    signal.addEventListener('abort', () => clean?.(), { once: true });
  },
};
