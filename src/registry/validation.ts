import type {
  CategoryDefinition,
  FeatureDefinition,
  RegistryValidationResult,
  SettingDefinition,
} from './types';

const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function validateSetting(featureId: string, setting: SettingDefinition, keys: Set<string>) {
  const errors: string[] = [];
  if (!ID_PATTERN.test(setting.key))
    errors.push(`${featureId}: invalid setting key "${setting.key}".`);
  if (keys.has(setting.key)) errors.push(`${featureId}: duplicate setting key "${setting.key}".`);
  keys.add(setting.key);
  if (setting.kind === 'number') {
    if (setting.min !== undefined && setting.default < setting.min)
      errors.push(`${featureId}.${setting.key}: default is below min.`);
    if (setting.max !== undefined && setting.default > setting.max)
      errors.push(`${featureId}.${setting.key}: default is above max.`);
  }
  if (
    setting.kind === 'select' &&
    !setting.options.some((option) => option.value === setting.default)
  ) {
    errors.push(`${featureId}.${setting.key}: default is not a declared option.`);
  }
  return errors;
}

export function validateRegistry(
  featureDefinitions: readonly FeatureDefinition[],
  categoryDefinitions: readonly CategoryDefinition[],
): RegistryValidationResult {
  const errors: string[] = [];
  const featureIds = new Set<string>();
  const categoryIds = new Set(categoryDefinitions.map(({ id }) => id));

  for (const feature of featureDefinitions) {
    if (!ID_PATTERN.test(feature.id)) errors.push(`Invalid feature ID "${feature.id}".`);
    if (featureIds.has(feature.id)) errors.push(`Duplicate feature ID "${feature.id}".`);
    featureIds.add(feature.id);
    const category = categoryDefinitions.find(({ id }) => id === feature.category);
    if (!categoryIds.has(feature.category))
      errors.push(`${feature.id}: unknown category "${feature.category}".`);
    else if (category && !feature.supportedSites.includes(category.site))
      errors.push(`${feature.id}: category site is not listed in supportedSites.`);
    if (feature.status === 'disabled' && !feature.disabledReason)
      errors.push(`${feature.id}: disabled features require a reason.`);
    if (!feature.supportedSites.length) errors.push(`${feature.id}: no supported sites.`);
    if (!feature.routes.length) errors.push(`${feature.id}: no route rules.`);
    if (!feature.availability.trim()) errors.push(`${feature.id}: missing availability guidance.`);
    const settingKeys = new Set<string>();
    for (const setting of feature.settings) {
      errors.push(...validateSetting(feature.id, setting, settingKeys));
    }
  }

  for (const feature of featureDefinitions) {
    for (const dependency of feature.dependencies ?? []) {
      if (!featureIds.has(dependency))
        errors.push(`${feature.id}: unknown dependency "${dependency}".`);
      if (dependency === feature.id) errors.push(`${feature.id}: cannot depend on itself.`);
    }
    for (const conflict of feature.conflicts ?? []) {
      if (!featureIds.has(conflict)) errors.push(`${feature.id}: unknown conflict "${conflict}".`);
      if (conflict === feature.id) errors.push(`${feature.id}: cannot conflict with itself.`);
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}
