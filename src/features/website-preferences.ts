import type { FeatureDefinition, FeatureRecord } from '../registry/types';
import { validateFeatureRecord } from '../storage/schema';

type Preference = Pick<
  FeatureDefinition,
  'id' | 'category' | 'title' | 'description' | 'availability'
> & {
  css: string | ((options: FeatureRecord['options']) => string);
  path?: RegExp;
  settings?: FeatureDefinition['settings'];
};

export function websitePreference({
  css,
  path,
  settings = [],
  ...metadata
}: Preference): FeatureDefinition {
  const definition: FeatureDefinition = {
    ...metadata,
    supportedSites: ['roblox'],
    routes: [{ hostnames: ['www.roblox.com'], path }],
    defaultEnabled: false,
    settings,
    activate({ record }) {
      const style = document.createElement('style');
      style.dataset.creatorToolkitOwner = metadata.id;
      style.textContent =
        typeof css === 'string' ? css : css(validateFeatureRecord(definition, record).options);
      document.head.append(style);
      return {
        deactivate: () => style.remove(),
        isHealthy: () => style.isConnected,
      };
    },
  };
  return definition;
}

export const websitePreferences = [
  websitePreference({
    id: 'hide-app-download',
    category: 'roblox-navigation',
    title: 'Hide app download button',
    description: 'Free up space in the header by hiding the app download shortcut.',
    availability: 'Roblox website header.',
    css: '.download-app-nav-item { display: none !important; }',
  }),
  websitePreference({
    id: 'hide-add-friends-tile',
    category: 'home',
    title: 'Hide Add Friends tile',
    description: 'Use the home carousel space for your existing friends.',
    availability: 'Roblox home page.',
    path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?home\/?$/i,
    css: `
      [data-testid="add-friends-tile"]:not(:has(a[href*="/profile"])),
      :is(.friends-carousel-tile, .friend-carousel-tile,
        :is(.friends-carousel-container, .friend-carousel-container, [data-testid*="friends-carousel" i]) [role="listitem"]):is(
          [aria-label="Add Friends" i], [data-testid="add-friends-button"],
          :has(.add-friends-icon-container, [data-testid="add-friends-button"], [aria-label="Add Friends" i])
        ):not([href*="/profile"]):not(:has(a[href*="/profile"])) {
        display: none !important;
      }
    `,
  }),
  websitePreference({
    id: 'hide-gift-card-link',
    category: 'roblox-navigation',
    title: 'Hide Buy Gift Cards shortcut',
    description: 'Remove the gift-card shortcut from the Roblox sidebar.',
    availability: 'Roblox sidebar on layouts with a gift-card link.',
    css: `
      :is(.left-nav, #left-navigation-container) a:is(
        [href="/giftcards"], [href^="/giftcards?"], [href^="https://www.roblox.com/giftcards"]
      ) { display: none !important; }
    `,
  }),
  websitePreference({
    id: 'thin-page-scrollbar',
    category: 'website-customization',
    title: 'Thin page scrollbar',
    description: 'Use a narrower browser scrollbar on Roblox pages.',
    availability: 'Roblox website page scrollbar.',
    css: ':root { scrollbar-width: thin; }',
  }),
  websitePreference({
    id: 'keyboard-focus-indicators',
    category: 'website-customization',
    title: 'Stronger keyboard focus indicators',
    description: 'Show a clear outline around the control you reach with Tab.',
    availability: 'Roblox website navigation and main content.',
    css: `
      @media (forced-colors: none) {
        :where(main, nav, header) :is(a[href], button, input, select, textarea, [tabindex]):focus-visible {
          outline: 2px solid currentColor !important;
          outline-offset: 2px !important;
        }
      }
    `,
  }),
];
