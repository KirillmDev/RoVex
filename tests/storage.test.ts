import { describe, expect, it } from 'vitest';
import { featureRegistry } from '../src/registry';
import { getFeature, getGlobal, setGlobal } from '../src/storage/chrome-storage';
import { initializeStorage } from '../src/storage/initialize';
import { applyImport, createExportDocument, previewImport } from '../src/storage/import-export';
import { GLOBAL_KEY, featureKey } from '../src/storage/schema';
import { mockStorage } from './setup';

describe('versioned storage', () => {
  it('derives and persists defaults without an aggregate settings copy', async () => {
    await initializeStorage();
    expect(await getGlobal()).toEqual({ enabled: true });
    expect((await getFeature(featureRegistry[0])).enabled).toBe(true);
    expect(mockStorage[GLOBAL_KEY]).toEqual({ enabled: true });
    expect(mockStorage[featureKey('quick-links')]).toBeTruthy();
    expect(mockStorage['creatorToolkit.settings']).toBeUndefined();
  });

  it('persists the master switch', async () => {
    await setGlobal({ enabled: false });
    expect(await getGlobal()).toEqual({ enabled: false });
  });

  it('exports known settings and rejects unknown imports', async () => {
    await initializeStorage();
    const exported = await createExportDocument();
    expect(exported.product).toBe('creator-toolkit');
    expect(exported.features['quick-links']).toBeTruthy();
    const preview = await previewImport({ ...exported, unexpected: true });
    expect(preview.valid).toBe(false);
    expect(preview.errors[0]).toContain('Unknown top-level key');
  });

  it('previews and applies a validated import', async () => {
    await initializeStorage();
    const exported = await createExportDocument();
    exported.global.enabled = false;
    const preview = await previewImport(exported);
    expect(preview.valid).toBe(true);
    expect(preview.changes.join(' ')).toContain('Master switch');
    await applyImport(preview);
    expect(await getGlobal()).toEqual({ enabled: false });
  });
});
