import { featureRegistry } from '../registry';
import type { FeatureRecord } from '../registry/types';
import { getGlobal, getFeature } from './chrome-storage';
import {
  CURRENT_SCHEMA_VERSION,
  GLOBAL_KEY,
  META_KEY,
  featureKey,
  knownStorageKeys,
  validateFeatureRecord,
  type GlobalRecord,
} from './schema';

export type ExportDocument = {
  product: 'creator-toolkit';
  formatVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  global: GlobalRecord;
  features: Record<string, FeatureRecord>;
};

export type ImportPreview = {
  valid: boolean;
  errors: string[];
  changes: string[];
  document?: ExportDocument;
};

export async function createExportDocument(): Promise<ExportDocument> {
  const entries = await Promise.all(
    featureRegistry.map(async (feature) => [feature.id, await getFeature(feature)] as const),
  );
  return {
    product: 'creator-toolkit',
    formatVersion: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    global: await getGlobal(),
    features: Object.fromEntries(entries),
  };
}

export async function downloadSettingsExport(): Promise<void> {
  const documentValue = await createExportDocument();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(documentValue, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `creator-toolkit-settings-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function previewImport(raw: unknown): Promise<ImportPreview> {
  const errors: string[] = [];
  const changes: string[] = [];
  if (!raw || typeof raw !== 'object')
    return { valid: false, errors: ['The file is not an object.'], changes };
  const input = raw as Record<string, unknown>;
  if (input.product !== 'creator-toolkit') errors.push('The file is not a Creator Toolkit export.');
  if (input.formatVersion !== 1) errors.push('Unsupported export format version.');
  if (typeof input.schemaVersion !== 'number' || input.schemaVersion > CURRENT_SCHEMA_VERSION)
    errors.push('The export was created by a newer, unsupported schema version.');
  if (!input.global || typeof input.global !== 'object') errors.push('Missing global settings.');
  if (!input.features || typeof input.features !== 'object')
    errors.push('Missing feature settings.');

  const allowedTopLevel = new Set([
    'product',
    'formatVersion',
    'schemaVersion',
    'exportedAt',
    'global',
    'features',
  ]);
  for (const key of Object.keys(input))
    if (!allowedTopLevel.has(key)) errors.push(`Unknown top-level key: ${key}`);

  const rawFeatures = (input.features ?? {}) as Record<string, unknown>;
  const knownFeatureIds = new Set(featureRegistry.map(({ id }) => id));
  for (const id of Object.keys(rawFeatures))
    if (!knownFeatureIds.has(id)) errors.push(`Unknown feature: ${id}`);

  const rawGlobal = (input.global ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(rawGlobal))
    if (key !== 'enabled') errors.push(`Unknown global setting: ${key}`);

  for (const feature of featureRegistry) {
    const rawRecord = rawFeatures[feature.id];
    if (!rawRecord || typeof rawRecord !== 'object') continue;
    const record = rawRecord as Record<string, unknown>;
    for (const key of Object.keys(record))
      if (!['enabled', 'options', 'data'].includes(key))
        errors.push(`Unknown key in ${feature.id}: ${key}`);
    const options =
      record.options && typeof record.options === 'object'
        ? (record.options as Record<string, unknown>)
        : {};
    const knownOptions = new Set(feature.settings.map(({ key }) => key));
    for (const key of Object.keys(options))
      if (!knownOptions.has(key)) errors.push(`Unknown setting in ${feature.id}: ${key}`);
    const data =
      record.data && typeof record.data === 'object'
        ? (record.data as Record<string, unknown>)
        : {};
    const knownData = new Set(feature.dataKeys ?? []);
    for (const key of Object.keys(data))
      if (!knownData.has(key)) errors.push(`Unknown data in ${feature.id}: ${key}`);
  }

  if (errors.length) return { valid: false, errors, changes };

  const globalInput = input.global as Record<string, unknown>;
  const global: GlobalRecord = { enabled: globalInput.enabled === true };
  const features: Record<string, FeatureRecord> = {};
  const currentGlobal = await getGlobal();
  if (currentGlobal.enabled !== global.enabled)
    changes.push(
      `Master switch: ${currentGlobal.enabled ? 'enabled' : 'disabled'} → ${global.enabled ? 'enabled' : 'disabled'}`,
    );

  for (const feature of featureRegistry) {
    const imported = validateFeatureRecord(feature, rawFeatures[feature.id]);
    features[feature.id] = imported;
    const current = await getFeature(feature);
    if (JSON.stringify(current) !== JSON.stringify(imported)) changes.push(feature.title);
  }

  return {
    valid: true,
    errors,
    changes,
    document: {
      product: 'creator-toolkit',
      formatVersion: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt:
        typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
      global,
      features,
    },
  };
}

export async function applyImport(preview: ImportPreview): Promise<void> {
  if (!preview.valid || !preview.document) throw new Error('Cannot apply an invalid import.');
  const updates: Record<string, unknown> = {
    [GLOBAL_KEY]: preview.document.global,
    [META_KEY]: { schemaVersion: CURRENT_SCHEMA_VERSION, lastMigratedAt: new Date().toISOString() },
  };
  for (const feature of featureRegistry) {
    updates[featureKey(feature.id)] = preview.document.features[feature.id];
  }
  await chrome.storage.local.set(updates);
}

export async function resetAllSettings(): Promise<void> {
  await chrome.storage.local.remove(knownStorageKeys(featureRegistry.map(({ id }) => id)));
}
