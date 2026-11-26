import { createRoot, type Root } from 'react-dom/client';
import { SettingsApp } from './SettingsApp';
import styles from '../styles/settings.css?inline';
import tokens from '../styles/tokens.css?inline';
import { OverlayRoot } from '../components/overlay-root';

const ROOT_TAG = 'creator-toolkit-settings-root';

type NativeElementState = {
  hidden: boolean;
  ariaHidden: string | null;
};

export type SettingsMount = {
  host: HTMLElement;
  target: HTMLElement;
  sync: () => void;
  unmount: () => void;
};

function isDarkTheme(target: HTMLElement) {
  const effective = getComputedStyle(target).colorScheme;
  if (effective === 'light' || effective === 'dark') return effective === 'dark';
  const explicitTheme =
    document.documentElement.getAttribute('data-theme') ??
    document.documentElement.getAttribute('color-scheme');
  if (explicitTheme === 'light' || explicitTheme === 'dark') return explicitTheme === 'dark';
  if (
    document.documentElement.classList.contains('light-theme') ||
    document.body?.classList.contains('light-theme')
  )
    return false;
  return (
    document.documentElement.classList.contains('dark-theme') ||
    document.body?.classList.contains('dark-theme') ||
    matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function mountSettings(target: HTMLElement): SettingsMount {
  document.querySelector(ROOT_TAG)?.remove();
  const hiddenElements = new Map<HTMLElement, NativeElementState>();
  const host = document.createElement(ROOT_TAG);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = tokens + styles;
  const app = document.createElement('div');
  const overlays = document.createElement('div');
  overlays.className = 'ct-overlay-root';
  shadow.append(style, app, overlays);
  target.append(host);

  const sync = () => {
    for (const child of target.children) {
      if (!(child instanceof HTMLElement) || child === host || hiddenElements.has(child)) continue;
      hiddenElements.set(child, {
        hidden: child.hidden,
        ariaHidden: child.getAttribute('aria-hidden'),
      });
      child.hidden = true;
      child.setAttribute('aria-hidden', 'true');
    }
  };
  sync();

  const updateTheme = () => host.classList.toggle('ct-dark', isDarkTheme(target));
  updateTheme();
  const themeObserver = new MutationObserver(updateTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'color-scheme'],
  });
  if (document.body)
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', updateTheme);
  const root: Root = createRoot(app);
  root.render(
    <OverlayRoot.Provider value={overlays}>
      <SettingsApp />
    </OverlayRoot.Provider>,
  );

  return {
    host,
    target,
    sync,
    unmount: () => {
      themeObserver.disconnect();
      media.removeEventListener('change', updateTheme);
      root.unmount();
      host.remove();
      for (const [element, state] of hiddenElements) {
        if (!element.isConnected) continue;
        element.hidden = state.hidden;
        if (state.ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', state.ariaHidden);
      }
      hiddenElements.clear();
    },
  };
}
