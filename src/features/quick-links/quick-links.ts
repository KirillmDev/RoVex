import { featureKey } from '../../storage/schema';
import type { FeatureDefinition, FeatureInstance, FeatureRecord } from '../../registry/types';

export type QuickLink = { id: string; title: string; url: string };

const OWNER = 'quick-links';
const MOUNT_TARGET_SELECTORS = ['main[role="main"]', 'main', '[role="main"]'] as const;

function findMountTarget(): HTMLElement | null {
  for (const selector of MOUNT_TARGET_SELECTORS) {
    const target = document.querySelector<HTMLElement>(selector);
    if (target) return target;
  }
  return null;
}

export function isSupportedCreatorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'create.roblox.com' &&
      url.port === '' &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

export function sanitizeQuickLinks(value: unknown, maxItems = 20): QuickLink[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  const links: QuickLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Partial<QuickLink>;
    if (
      typeof raw.id !== 'string' ||
      typeof raw.title !== 'string' ||
      typeof raw.url !== 'string' ||
      ids.has(raw.id) ||
      !isSupportedCreatorUrl(raw.url)
    )
      continue;
    ids.add(raw.id);
    links.push({ id: raw.id, title: raw.title.trim().slice(0, 80) || 'Creator Hub', url: raw.url });
    if (links.length >= maxItems) break;
  }
  return links;
}

function quickLinksFromRecord(record: FeatureRecord): QuickLink[] {
  const maxItems = Number(record.options['max-items'] ?? 20);
  return sanitizeQuickLinks(record.data?.shortcuts, maxItems);
}

async function saveRecord(record: FeatureRecord, shortcuts: QuickLink[]) {
  record.data = { ...record.data, shortcuts };
  await chrome.storage.local.set({ [featureKey(quickLinksFeature.id)]: record });
}

const QUICK_LINK_STYLES = `
  :host { all: initial; display:block; color-scheme: light dark; margin:0 0 16px; }
  * { box-sizing: border-box; }
  details { border: 1px solid var(--ct-border); border-radius: 10px; background: var(--ct-surface); color: var(--ct-text);
    font-family: system-ui, sans-serif; overflow:hidden; }
  summary { cursor:pointer; padding:12px 14px; font-size:14px; line-height:1.3; font-weight:700; }
  summary:hover, summary:focus-visible { background:var(--ct-hover); }
  .panel { border-top:1px solid var(--ct-border); padding:12px; }
  button, a { font: inherit; }
  .icon-button { border:0; background:transparent; color:inherit; border-radius:6px; padding:5px 7px; cursor:pointer; }
  .icon-button:hover, .icon-button:focus-visible { background:var(--ct-hover); outline:2px solid transparent; }
  .add { width:100%; border:1px solid var(--ct-border); background:var(--ct-emphasis); color:var(--ct-emphasis-text); border-radius:8px;
    padding:8px 10px; font-weight:650; cursor:pointer; margin-bottom:8px; }
  ol { list-style:none; padding:0; margin:0; display:grid; gap:6px; }
  li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; border:1px solid var(--ct-border); border-radius:8px; padding:7px; }
  a { color:inherit; text-decoration:none; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:13px; font-weight:600; }
  a:hover, a:focus-visible { text-decoration:underline; }
  .actions { display:flex; }
  .empty { color:var(--ct-muted); font-size:13px; padding:8px 4px; margin:0; }
`;

function applyTokens(host: HTMLElement) {
  const dark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark-theme') ||
    document.body?.classList.contains('dark-theme') ||
    matchMedia('(prefers-color-scheme: dark)').matches;
  host.style.setProperty('--ct-surface', dark ? '#24252a' : '#ffffff');
  host.style.setProperty('--ct-text', dark ? '#f1f1f3' : '#202227');
  host.style.setProperty('--ct-muted', dark ? '#b8bac2' : '#60646f');
  host.style.setProperty('--ct-border', dark ? '#43454e' : '#d7d9df');
  host.style.setProperty('--ct-hover', dark ? '#34363d' : '#f1f2f4');
  host.style.setProperty('--ct-emphasis', dark ? '#f7f7f8' : '#202227');
  host.style.setProperty('--ct-emphasis-text', dark ? '#202227' : '#ffffff');
}

export const quickLinksFeature: FeatureDefinition = {
  id: 'quick-links',
  category: 'productivity',
  title: 'Quick Links',
  description: 'Save, reorder, and open shortcuts to supported Creator Hub pages.',
  availability: 'Appears at the top of Creator Hub page content.',
  supportedSites: ['creator-hub'],
  routes: [{ hostnames: ['create.roblox.com'], path: /^\// }],
  defaultEnabled: true,
  dataKeys: ['shortcuts'],
  settings: [
    {
      key: 'max-items',
      kind: 'number',
      label: 'Maximum shortcuts',
      description: 'Limits how many Creator Hub shortcuts can be saved.',
      default: 20,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: 'show-add-current',
      kind: 'boolean',
      label: 'Show “Save current page”',
      default: true,
    },
  ],
  activate({ signal, record }): FeatureInstance {
    document
      .querySelectorAll(`[data-creator-toolkit-owner="${OWNER}"]`)
      .forEach((node) => node.remove());
    const target = findMountTarget();
    if (!target) return { isHealthy: () => false };
    const host = document.createElement('div');
    host.dataset.creatorToolkitOwner = OWNER;
    applyTokens(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = QUICK_LINK_STYLES;
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Quick Links';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('aria-label', 'Creator Toolkit Quick Links');
    details.append(summary, panel);
    shadow.append(style, details);

    let links = quickLinksFromRecord(record);

    const render = () => {
      panel.replaceChildren();
      if (record.options['show-add-current'] === true) {
        const add = document.createElement('button');
        add.className = 'add';
        add.type = 'button';
        add.textContent = 'Save current page';
        add.disabled = !isSupportedCreatorUrl(location.href);
        add.addEventListener(
          'click',
          async () => {
            if (links.some((item) => item.url === location.href)) return;
            const maxItems = Number(record.options['max-items'] ?? 20);
            if (links.length >= maxItems) return;
            links = [
              ...links,
              {
                id: crypto.randomUUID(),
                title: document.title.replace(/\s+-\s+Roblox.*$/i, '').trim() || location.pathname,
                url: location.href,
              },
            ];
            await saveRecord(record, links);
            render();
          },
          { signal },
        );
        panel.append(add);
      }

      if (!links.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'No shortcuts saved yet.';
        panel.append(empty);
        return;
      }

      const list = document.createElement('ol');
      links.forEach((link, index) => {
        const item = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.textContent = link.title;
        anchor.title = link.url;
        const actions = document.createElement('div');
        actions.className = 'actions';
        const action = (label: string, text: string, handler: () => void, disabled = false) => {
          const button = document.createElement('button');
          button.className = 'icon-button';
          button.type = 'button';
          button.setAttribute('aria-label', label);
          button.textContent = text;
          button.disabled = disabled;
          button.addEventListener('click', handler, { signal });
          return button;
        };
        const move = async (offset: number) => {
          const target = index + offset;
          if (target < 0 || target >= links.length) return;
          const next = [...links];
          [next[index], next[target]] = [next[target], next[index]];
          links = next;
          await saveRecord(record, links);
          render();
        };
        actions.append(
          action(`Move ${link.title} up`, '↑', () => void move(-1), index === 0),
          action(`Move ${link.title} down`, '↓', () => void move(1), index === links.length - 1),
          action(`Remove ${link.title}`, '✕', () => {
            links = links.filter(({ id }) => id !== link.id);
            void saveRecord(record, links).then(render);
          }),
        );
        item.append(anchor, actions);
        list.append(item);
      });
      panel.append(list);
    };

    target.prepend(host);
    render();

    return {
      deactivate: () => host.remove(),
      isHealthy: () => host.isConnected && host.parentElement === target,
    };
  },
};
