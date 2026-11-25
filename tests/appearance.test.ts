import { describe, expect, it } from 'vitest';
import { appearanceFeatures } from '../src/features/appearance';
import { featureDefaults } from '../src/storage/schema';

const cases = [
  ['site-palette', { palette: 'daylight' }, '--color-surface-0: #f1f3f5'],
  ['site-accent', { accent: '#663399' }, '--color-action-emphasis-background: #663399'],
  ['site-text-scale', { size: 22 }, 'font-size: 22px'],
  ['reading-line-spacing', { spacing: 1.8 }, 'line-height: 1.8'],
  ['content-width', { width: 1440 }, 'max-width: 1440px'],
  ['thumbnail-corners', { radius: 0 }, 'border-radius: 0px'],
  ['underline-reading-links', {}, 'text-decoration: underline'],
  ['reduce-content-motion', {}, 'animation-duration: 0.01ms'],
] as const;

describe('website customization', () => {
  it.each(cases)('applies and removes %s', async (id, options, expected) => {
    const feature = appearanceFeatures.find((item) => item.id === id)!;
    const selector = `style[data-creator-toolkit-owner="${id}"]`;
    const defaults = featureDefaults(feature);
    expect(defaults.enabled).toBe(false);
    const instance = await feature.activate({
      signal: new AbortController().signal,
      ownerSelector: selector,
      record: { ...defaults, enabled: true, options: { ...defaults.options, ...options } },
      route: {
        hostname: 'www.roblox.com',
        pathname: '/home',
        search: '',
        hash: '',
        searchParams: new URLSearchParams(),
      },
    });
    try {
      expect(document.querySelector(selector)?.textContent).toContain(expected);
      expect(instance?.isHealthy?.()).toBe(true);
    } finally {
      await instance?.deactivate?.();
    }
    expect(document.querySelector(selector)).toBeNull();
  });

  it('validates imported colors before interpolation', () => {
    const feature = appearanceFeatures.find(({ id }) => id === 'site-accent')!;
    const defaults = featureDefaults(feature);
    const record = { ...defaults, options: { accent: '#fff; color: red', foreground: '#22aaee' } };
    const selector = 'style[data-creator-toolkit-owner="site-accent"]';
    const instance = feature.activate({
      signal: new AbortController().signal,
      ownerSelector: selector,
      record,
      route: {
        hostname: 'www.roblox.com',
        pathname: '/home',
        search: '',
        hash: '',
        searchParams: new URLSearchParams(),
      },
    });
    const style = document.querySelector(selector);
    expect(style?.textContent).toContain('#335fff');
    expect(style?.textContent).toContain('#22aaee');
    expect(style?.textContent).not.toContain('color: red');
    style?.remove();
    void instance;
  });
});
