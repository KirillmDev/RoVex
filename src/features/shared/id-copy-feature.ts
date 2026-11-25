import type {
  CategoryId,
  FeatureDefinition,
  FeatureInstance,
  RouteRule,
  RouteSnapshot,
  SiteId,
} from '../../registry/types';

type IdCopyFeatureSpec = {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  availability: string;
  idLabel: string;
  supportedSites: readonly SiteId[];
  routes: readonly RouteRule[];
  extract: (route: RouteSnapshot) => string | null;
};

const PAGE_HEADERS: Partial<Record<CategoryId, string>> = {
  profiles: '.user-profile-header, .profile-header, [data-testid="profile-header"]',
  experiences: '.game-main-content, [data-testid="experience-header"]',
  marketplace: '#item-container, [data-testid="item-details"]',
  communities: '.group-header, [data-testid="community-header"]',
};

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy was rejected.');
}

const ACTION_STYLES = `
  :host { display:inline-block; margin:4px 0; max-width:100%; color-scheme:light dark; }
  * { box-sizing:border-box; }
  .action {
    display:inline-flex; align-items:center; flex-wrap:wrap; gap:8px;
    color:var(--color-content-emphasis, CanvasText);
    font-family:Builder Sans, Inter, Arial, sans-serif;
  }
  .copy { min-width:0; }
  code { overflow:hidden; text-overflow:ellipsis; font:600 14px/20px ui-monospace, SFMono-Regular, Consolas, monospace; }
  button {
    flex:none; min-height:32px; padding:5px 12px; border:1px solid var(--color-border-default, color-mix(in srgb, CanvasText 24%, transparent)); border-radius:8px;
    background:transparent;
    color:var(--color-content-emphasis, CanvasText);
    font:600 14px/20px Builder Sans, Inter, Arial, sans-serif; cursor:pointer;
  }
  button:hover { background:var(--color-action-standard-background-hover, color-mix(in srgb, CanvasText 8%, transparent)); }
  button:focus-visible { outline:2px solid var(--color-focus, #335fff); outline-offset:2px; }
  button[data-state="success"] { background:var(--color-state-success, #16813d); color:white; }
  button[data-state="error"] { background:var(--color-state-error, #c4281c); color:white; }
`;

function mountIdAction(
  owner: string,
  category: CategoryId,
  idLabel: string,
  value: string,
  showId: boolean,
  signal: AbortSignal,
): FeatureInstance {
  document
    .querySelectorAll(`[data-creator-toolkit-owner="${owner}"]`)
    .forEach((node) => node.remove());
  const selector = PAGE_HEADERS[category];
  const header = selector ? document.querySelector(selector) : null;
  const heading = header?.querySelector('h1, h2');
  if (!header) return { isHealthy: () => false };

  const host = document.createElement('div');
  host.dataset.creatorToolkitOwner = owner;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = ACTION_STYLES;
  const action = document.createElement('section');
  action.className = 'action';
  action.setAttribute('aria-label', `RoVex ${idLabel}`);
  if (showId) {
    const code = document.createElement('code');
    code.className = 'copy';
    code.textContent = value;
    action.append(code);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `Copy ${idLabel}`;
  const normalText = button.textContent;
  let resetTimer: number | undefined;
  button.addEventListener(
    'click',
    async () => {
      window.clearTimeout(resetTimer);
      try {
        await copyText(value);
        button.dataset.state = 'success';
        button.textContent = 'Copied';
      } catch {
        button.dataset.state = 'error';
        button.textContent = 'Copy failed';
      }
      resetTimer = window.setTimeout(() => {
        if (signal.aborted) return;
        delete button.dataset.state;
        button.textContent = normalText;
      }, 1400);
    },
    { signal },
  );
  action.append(button);
  shadow.append(style, action);

  if (heading) heading.after(host);
  else header.append(host);

  return {
    deactivate: () => {
      window.clearTimeout(resetTimer);
      host.remove();
    },
    isHealthy: () => host.isConnected,
  };
}

export function createIdCopyFeature(spec: IdCopyFeatureSpec): FeatureDefinition {
  return {
    id: spec.id,
    category: spec.category,
    title: spec.title,
    description: spec.description,
    availability: spec.availability,
    supportedSites: spec.supportedSites,
    routes: spec.routes,
    defaultEnabled: true,
    settings: [
      {
        key: 'show-id',
        kind: 'boolean',
        label: 'Show the ID on the page',
        description: `Displays the ${spec.idLabel.toLowerCase()} next to the copy action.`,
        default: true,
      },
    ],
    activate({ record, route, signal }) {
      const value = spec.extract(route);
      if (!value) return { isHealthy: () => false };
      return mountIdAction(
        spec.id,
        spec.category,
        spec.idLabel,
        value,
        record.options['show-id'] === true,
        signal,
      );
    },
  };
}

export function pathSegmentId(pathname: string, segment: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const index = parts.findIndex((part) => part.toLowerCase() === segment.toLowerCase());
  const value = index >= 0 ? parts[index + 1] : undefined;
  return value && /^\d+$/.test(value) ? value : null;
}
