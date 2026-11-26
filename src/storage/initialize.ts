import { featureRegistry } from '../registry';
import { migrateStorage } from './chrome-storage';
import { defaultGlobal, featureDefaults, featureKey, GLOBAL_KEY } from './schema';

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
