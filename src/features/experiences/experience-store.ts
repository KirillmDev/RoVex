import type { FeatureDefinition } from '../../registry/types';
import {
  experiencePath,
  robloxApi,
  RobloxApiError,
  robloxId,
  universeForPlace,
} from '../../api/roblox-data';
import { ownedElement, watchDom } from '../../core/live-dom';
import { liveStatus } from '../../components/dom';
import { message } from '../../localization/messages';
import styles from './experience-store.css?inline';
import tokens from '../../styles/tokens.css?inline';

type Item = {
  id: string;
  linkId?: string;
  name: string;
  price?: number;
  onSale?: boolean;
  icon?: string;
};
type Filter = 'all' | 'on' | 'off';
const FILTER_EVENT = 'rovex:store-filter';
const hidden = 'data-rovex-sale-hidden';
const modes = new WeakMap<Element, Filter>();
const storeSelector =
  '.tab-pane.store, #store.tab-pane, #store-tab, [data-testid="experience-store-tab-panel"], [data-testid="store-tab-panel"]';
const owner = (id: string) => `[data-creator-toolkit-owner="${id}"]`;

function visibleStore(): Element | undefined {
  const panels = [...document.querySelectorAll(storeSelector)];
  for (const tab of document.querySelectorAll(
    '[role="tab"][aria-selected="true"][aria-controls]',
  )) {
    if (
      !/store/i.test(
        [tab.id, tab.getAttribute('data-testid'), tab.getAttribute('aria-controls')].join(' '),
      )
    )
      continue;
    const panel = document.getElementById(tab.getAttribute('aria-controls')!);
    if (panel) panels.push(panel);
  }
  return panels.find(
    (panel) =>
      !panel.matches('a, button, [role="tab"]') &&
      !panel.closest('[hidden], [aria-hidden="true"]') &&
      getComputedStyle(panel).visibility === 'visible' &&
      panel.getClientRects().length,
  );
}

export function matchesStoreFilter(mode: Filter, onSale?: boolean): boolean {
  return mode === 'all' || onSale === undefined || onSale === (mode === 'on');
}

export function normalizeStoreItem(value: unknown, kind: 'products' | 'passes'): Item | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = robloxId(
    kind === 'products'
      ? (row.developerProductId ??
          row.DeveloperProductId ??
          row.productId ??
          row.ProductId ??
          row.id)
      : row.id,
  );
  const name = row.displayName ?? row.DisplayName ?? row.name ?? row.Name;
  if (!id || typeof name !== 'string' || !name.trim()) return null;
  const price = row.priceInRobux ?? row.price ?? row.PriceInRobux;
  const sale = row.isForSale ?? row.IsForSale;
  return {
    id,
    ...(kind === 'products' && {
      linkId: robloxId(row.productId ?? row.ProductId) ?? id,
    }),
    name: name.trim(),
    price:
      typeof price === 'number' && Number.isSafeInteger(price) && price >= 0 ? price : undefined,
    onSale: typeof sale === 'boolean' ? sale : undefined,
    icon:
      robloxId(
        row.displayIconImageAssetId ??
          row.DisplayIconImageAssetId ??
          row.iconImageAssetId ??
          row.IconImageAssetId ??
          row.displayIcon,
      ) ?? undefined,
  };
}

async function loadItems(kind: 'products' | 'passes', place: string, signal: AbortSignal) {
  const universe =
    robloxId(document.querySelector('#game-detail-meta-data')?.getAttribute('data-universe-id')) ??
    (await universeForPlace(place, signal));
  const items = new Map<string, Item>();
  let cursor = '';
  const visited = new Set<string>();
  for (let page = 0; page < 5 && !signal.aborted; page++) {
    const products =
      kind === 'products' ? await robloxApi('products', universe, { cursor, signal }) : null;
    const passes =
      kind === 'passes' ? await robloxApi('passes', universe, { cursor, signal }) : null;
    const rows = products
      ? (products.developerProducts ?? products.DeveloperProducts)
      : passes?.gamePasses;
    if (!Array.isArray(rows)) throw new RobloxApiError('unavailable');
    let valid = 0;
    for (const row of rows) {
      const item = normalizeStoreItem(row, kind);
      if (item) {
        items.set(item.id, item);
        valid++;
      }
    }
    if (rows.length && !valid) throw new RobloxApiError('unavailable');
    cursor = products?.nextPageCursor ?? products?.NextPageCursor ?? passes?.nextPageToken ?? '';
    if (typeof cursor !== 'string' || cursor.length > 1024) throw new RobloxApiError('unavailable');
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
  style.textContent = tokens + styles;
  const heading = document.createElement('h3');
  heading.textContent = title;
  const note = liveStatus();
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
    let active: { panel: Element; section: HTMLElement; listeners: AbortController } | undefined;
    function clear() {
      active?.listeners.abort();
      active?.section.remove();
      active = undefined;
    }
    signal.addEventListener('abort', clear, { once: true });
    watchDom(signal, () => {
      const store = visibleStore();
      if (active && active.panel === store && active.section.isConnected) return;
      clear();
      if (!store || store.querySelector('.rovalra-dev-products')) return;
      const listeners = new AbortController();
      const section = makeSection(message('developer_products', 'Developer products'));
      section.host.dataset.creatorToolkitOwner = 'view-developer-products';
      section.note.textContent = message(
        'developer_products_loading',
        'Loading developer products…',
      );
      active = { panel: store, section: section.host, listeners };
      store.append(section.host);
      loaded ??= loadItems('products', place, signal);
      const currentLoad = loaded;
      void loaded
        .then(async ({ universe, items, partial }) => {
          if (signal.aborted || !section.host.isConnected) return;
          const rows = new Map<string, HTMLLIElement>();
          for (const item of items.values()) {
            const row = card(
              item,
              `/developer-product/${universe}/product/${item.linkId ?? item.id}`,
            );
            rows.set(item.id, row);
            section.grid.append(row);
          }
          const render = () => {
            const mode = modes.get(store) ?? 'all';
            const nativeLinks = new Set(
              [
                ...store.querySelectorAll<HTMLAnchorElement>(
                  '#rbx-developer-products a[href*="/developer-product/"]',
                ),
              ]
                .filter((link) => link.getClientRects().length)
                .map((link) => new URL(link.href).pathname.replace(/\/$/, '')),
            );
            let visible = 0;
            let nativeCount = 0;
            for (const item of items.values()) {
              const duplicate = nativeLinks.has(
                `/developer-product/${universe}/product/${item.linkId ?? item.id}`,
              );
              if (duplicate) nativeCount++;
              const show = !duplicate && matchesStoreFilter(mode, item.onSale);
              const row = rows.get(item.id)!;
              if (row.hidden === show) row.hidden = !show;
              if (show) visible++;
            }
            const feedback = !items.size
              ? 'No publicly listed developer products.'
              : !visible && nativeCount === items.size && !partial
                ? 'These developer products are already listed above.'
                : !visible
                  ? 'No products match this filter.'
                  : [
                      partial ? 'Showing the first available pages.' : '',
                      mode !== 'all' &&
                      [...items.values()].some((item) => item.onSale === undefined)
                        ? 'Products with unknown sale status remain visible.'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
            if (section.note.textContent !== feedback) section.note.textContent = feedback;
          };
          store.addEventListener(FILTER_EVENT, render, { signal: listeners.signal });
          watchDom(listeners.signal, render);
          const icons = [
            ...new Set([...items.values()].flatMap((item) => (item.icon ? [item.icon] : []))),
          ];
          for (
            let offset = 0;
            offset < icons.length && !signal.aborted && section.host.isConnected;
            offset += 100
          ) {
            const thumbs = await robloxApi('icons', icons.slice(offset, offset + 100).join(','), {
              signal: listeners.signal,
            }).catch(() => null);
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
        .catch((error: unknown) => {
          if (loaded === currentLoad) loaded = undefined;
          if (!signal.aborted && section.host.isConnected) {
            section.note.textContent =
              error instanceof RobloxApiError && error.code === 'restricted'
                ? message(
                    'developer_products_restricted',
                    'Roblox does not make developer products available for this experience.',
                  )
                : message(
                    'developer_products_unavailable',
                    'Developer products are temporarily unavailable. Reopen the Store to retry.',
                  );
          }
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
      const store = visibleStore();
      if (activeStore && activeStore !== store) {
        clean?.();
        clean = undefined;
        activeStore = undefined;
      }
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
