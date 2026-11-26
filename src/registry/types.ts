import type { ContributorId } from './contributors';

export type SiteId = 'roblox' | 'creator-hub';

export type CategoryId =
  | 'home'
  | 'profiles'
  | 'experiences'
  | 'marketplace'
  | 'avatar'
  | 'communities'
  | 'transactions'
  | 'roblox-navigation'
  | 'privacy'
  | 'roblox-miscellaneous'
  | 'roblox-developer'
  | 'website-customization'
  | 'dashboard'
  | 'creations'
  | 'analytics'
  | 'monetization'
  | 'avatar-items'
  | 'development-items'
  | 'developer-tools'
  | 'ugc-tools'
  | 'productivity';

export type RouteRule = {
  hostnames: readonly string[];
  path?: RegExp;
  query?: Readonly<Record<string, string | true>>;
  hash?: RegExp;
};

export type SettingOption = { value: string; label: string };

type SettingBase = {
  key: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
};

export type BooleanSetting = SettingBase & { kind: 'boolean'; default: boolean };
export type NumberSetting = SettingBase & {
  kind: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
  presentation?: 'slider';
};
export type ColorSetting = SettingBase & { kind: 'color'; default: string };
export type TextSetting = SettingBase & {
  kind: 'text';
  default: string;
  placeholder?: string;
  maxLength?: number;
};
export type SelectSetting = SettingBase & {
  kind: 'select';
  default: string;
  options: readonly SettingOption[];
};
export type SettingDefinition =
  BooleanSetting | NumberSetting | TextSetting | SelectSetting | ColorSetting;

export type FeatureRecord = {
  enabled: boolean;
  options: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export type FeatureInstance = {
  deactivate?: () => void | Promise<void>;
  isHealthy?: () => boolean;
};

export type FeatureContext = {
  signal: AbortSignal;
  route: RouteSnapshot;
  record: FeatureRecord;
  ownerSelector: string;
};

export type FeatureDefinition = {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  availability: string;
  supportedSites: readonly SiteId[];
  routes: readonly RouteRule[];
  defaultEnabled: boolean;
  status?: 'stable' | 'beta' | 'experimental' | 'deprecated' | 'locked' | 'disabled';
  contributorIds?: readonly ContributorId[];
  statusReason?: string;
  disabledReason?: string;
  settings: readonly SettingDefinition[];
  dataKeys?: readonly string[];
  dependencies?: readonly string[];
  conflicts?: readonly string[];
  activate: (context: FeatureContext) => FeatureInstance | void | Promise<FeatureInstance | void>;
};

export type CategoryDefinition = {
  id: CategoryId;
  site: SiteId;
  title: string;
  description: string;
  order: number;
};

export type RouteSnapshot = {
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  searchParams: URLSearchParams;
};

export type RegistryValidationResult = { valid: true } | { valid: false; errors: string[] };
