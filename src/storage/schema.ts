import type { FeatureDefinition, FeatureRecord, SettingDefinition } from '../registry/types';

export const STORAGE_PREFIX = 'creatorToolkit.';
export const META_KEY = `${STORAGE_PREFIX}meta`;
export const GLOBAL_KEY = `${STORAGE_PREFIX}global`;
export const CURRENT_SCHEMA_VERSION = 1;

export type MetaRecord = { schemaVersion: number; lastMigratedAt?: string };
export type GlobalRecord = { enabled: boolean };

export const featureKey = (featureId: string) => `${STORAGE_PREFIX}feature.${featureId}`;

export function settingsDefaults(settings: readonly SettingDefinition[]): Record<string, unknown> {
  return Object.fromEntries(settings.map((setting) => [setting.key, setting.default]));
}

export function featureDefaults(feature: FeatureDefinition): FeatureRecord {
  return {
    enabled: feature.defaultEnabled,
    options: settingsDefaults(feature.settings),
    data: {},
  };
}

export const defaultMeta = (): MetaRecord => ({ schemaVersion: CURRENT_SCHEMA_VERSION });
export const defaultGlobal = (): GlobalRecord => ({ enabled: true });

function validateOption(setting: SettingDefinition, value: unknown): unknown {
  switch (setting.kind) {
    case 'color':
      return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : setting.default;
    case 'boolean':
      return typeof value === 'boolean' ? value : setting.default;
    case 'text':
      return typeof value === 'string'
        ? value.slice(0, setting.maxLength ?? Number.POSITIVE_INFINITY)
        : setting.default;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return setting.default;
      return Math.min(setting.max ?? value, Math.max(setting.min ?? value, value));
    }
    case 'select':
      return typeof value === 'string' && setting.options.some((option) => option.value === value)
        ? value
        : setting.default;
  }
}

export function validateFeatureRecord(feature: FeatureDefinition, raw: unknown): FeatureRecord {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawOptions =
    input.options && typeof input.options === 'object'
      ? (input.options as Record<string, unknown>)
      : {};
  const options = Object.fromEntries(
    feature.settings.map((setting) => [
      setting.key,
      validateOption(setting, rawOptions[setting.key]),
    ]),
  );
  const data = input.data && typeof input.data === 'object' ? input.data : {};
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : feature.defaultEnabled,
    options,
    data: data as Record<string, unknown>,
  };
}

export function knownStorageKeys(featureIds: readonly string[]): string[] {
  return [META_KEY, GLOBAL_KEY, ...featureIds.map(featureKey)];
}
