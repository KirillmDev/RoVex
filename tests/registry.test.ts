import { describe, expect, it } from 'vitest';
import { categories, featureRegistry, websiteFeatureRegistry } from '../src/registry';
import { validateRegistry } from '../src/registry/validation';

describe('feature registry validation', () => {
  it('accepts the production registry', () => {
    expect(validateRegistry(featureRegistry, categories)).toEqual({ valid: true });
    expect(websiteFeatureRegistry).toHaveLength(33);
    expect(websiteFeatureRegistry.map(({ id }) => id)).not.toContain('quick-links');
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
