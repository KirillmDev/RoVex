import { describe, expect, it } from 'vitest';
import { categories, featureRegistry, websiteFeatureRegistry } from '../src/registry';
import { validateRegistry } from '../src/registry/validation';

describe('feature registry validation', () => {
  it('accepts the production registry', () => {
    expect(validateRegistry(featureRegistry, categories)).toEqual({ valid: true });
    expect(websiteFeatureRegistry.map(({ id }) => id).sort()).toEqual(
      [
        'community-creation-date',
        'collapse-sidebar',
        'content-width',
        'copy-asset-id',
        'copy-bundle-id',
        'copy-community-id',
        'copy-id-context-menu',
        'copy-place-id',
        'copy-user-id',
        'detailed-experience-dates',
        'full-robux-balance',
        'hide-add-friends-tile',
        'hide-app-download',
        'hide-gift-card-link',
        'keyboard-focus-indicators',
        'keyboard-search',
        'my-transactions-link',
        'quick-play',
        'public-server-browser',
        'quiet-sidebar',
        'reading-line-spacing',
        'recent-experiences',
        'reduce-content-motion',
        'saved-experiences',
        'saved-marketplace',
        'site-accent',
        'site-palette',
        'site-text-scale',
        'store-sale-filter',
        'streamer-mode',
        'thin-page-scrollbar',
        'thumbnail-corners',
        'underline-reading-links',
        'verified-navigation-badges',
        'view-developer-products',
        'wide-player-counts',
      ].sort(),
    );
  });

  it('rejects duplicate IDs and unknown dependencies', () => {
    const duplicate = { ...featureRegistry[0], dependencies: ['missing-feature'] };
    const result = validateRegistry([featureRegistry[0], duplicate], categories);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(' ')).toContain('Duplicate feature ID');
      expect(result.errors.join(' ')).toContain('unknown dependency');
    }
  });
});
