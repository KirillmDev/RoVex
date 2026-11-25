import type { FeatureDefinition } from '../../registry/types';

export const keyboardSearch: FeatureDefinition = {
  id: 'keyboard-search',
  category: 'roblox-navigation',
  title: 'Focus Roblox search with /',
  description: 'Press / to jump to the site search from anywhere on the page.',
  availability: 'Roblox pages with a visible header search box.',
  defaultEnabled: false,
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'] }],
  settings: [],
  activate({ signal }) {
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key !== '/' ||
          event.defaultPrevented ||
          event.isComposing ||
          event.repeat ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return;
        if (
          event
            .composedPath()
            .some(
              (node) =>
                node instanceof HTMLElement &&
                (node.isContentEditable ||
                  node.matches('input, textarea, select, [role="textbox"], [role="combobox"]')),
            )
        )
          return;
        if (
          document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([hidden])')
        )
          return;
        const search = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            '#navbar-search-input, header input[type="search"], #header input[type="search"]',
          ),
        ).find((input) => !input.disabled && input.getClientRects().length > 0);
        if (!search) return;
        search.focus();
        if (document.activeElement === search) event.preventDefault();
      },
      { signal },
    );
  },
};
