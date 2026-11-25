import { featureRegistry } from '../registry';
import type { FeatureDefinition, FeatureRecord } from '../registry/types';
import {
  CURRENT_SCHEMA_VERSION,
  GLOBAL_KEY,
  META_KEY,
  defaultGlobal,
  defaultMeta,
  featureDefaults,
  featureKey,
  validateFeatureRecord,
  type GlobalRecord,
  type MetaRecord,
} from './schema';

export async function migrateStorage(): Promise<void> {
  const result = await chrome.storage.local.get([META_KEY]);
  const meta = result[META_KEY] as MetaRecord | undefined;
  if (!meta || meta.schemaVersion < CURRENT_SCHEMA_VERSION) {
    await chrome.storage.local.set({
      [META_KEY]: { ...defaultMeta(), lastMigratedAt: new Date().toISOString() },
    });
  }
}

export async function getGlobal(): Promise<GlobalRecord> {
  const result = await chrome.storage.local.get([GLOBAL_KEY]);
  const raw = result[GLOBAL_KEY] as Partial<GlobalRecord> | undefined;
  return { enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : defaultGlobal().enabled };
}

export async function setGlobal(value: GlobalRecord): Promise<void> {
  await chrome.storage.local.set({ [GLOBAL_KEY]: { enabled: value.enabled } });
}

export async function getFeature(feature: FeatureDefinition): Promise<FeatureRecord> {
  const key = featureKey(feature.id);
  const result = await chrome.storage.local.get([key]);
  return validateFeatureRecord(feature, result[key]);
}

export async function getRuntimeSettings(features: readonly FeatureDefinition[]) {
  const values = await chrome.storage.local.get([
    GLOBAL_KEY,
    ...features.map(({ id }) => featureKey(id)),
  ]);
  const enabled = (values[GLOBAL_KEY] as Partial<GlobalRecord> | undefined)?.enabled;
  return {
    enabled: typeof enabled === 'boolean' ? enabled : defaultGlobal().enabled,
    records: new Map(
      features.map(
        (feature) =>
          [feature.id, validateFeatureRecord(feature, values[featureKey(feature.id)])] as const,
      ),
    ),
  };
}

export async function setFeature(feature: FeatureDefinition, value: FeatureRecord): Promise<void> {
  await chrome.storage.local.set({
    [featureKey(feature.id)]: validateFeatureRecord(feature, value),
  });
}

export async function initializeStorage(): Promise<void> {
  await migrateStorage();
  const keys = [GLOBAL_KEY, ...featureRegistry.map(({ id }) => featureKey(id))];
  const existing = await chrome.storage.local.get(keys);
  const updates: Record<string, unknown> = {};
  if (!(GLOBAL_KEY in existing)) updates[GLOBAL_KEY] = defaultGlobal();
  for (const feature of featureRegistry) {
    const key = featureKey(feature.id);
    if (!(key in existing)) updates[key] = featureDefaults(feature);
  }
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
}
