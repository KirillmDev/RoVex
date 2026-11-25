import { categories } from './categories';
import { quickLinksFeature } from '../features/quick-links/quick-links';
import { copyAssetIdFeature } from '../features/copy-asset-id/copy-asset-id';
import { copyCommunityIdFeature } from '../features/copy-community-id/copy-community-id';
import { copyPlaceIdFeature } from '../features/copy-place-id/copy-place-id';
import { copyUniverseIdFeature } from '../features/copy-universe-id/copy-universe-id';
import { copyUserIdFeature } from '../features/copy-user-id/copy-user-id';
import { validateRegistry } from './validation';
import { websiteFeatures } from '../features/website-features';
import { websitePreferences } from '../features/website-preferences';
import { appearanceFeatures } from '../features/appearance';
import { pageLibraries } from '../features/page-library';
import { keyboardSearch } from '../features/keyboard-search';
import {
  quickPlay,
  widePlayerCounts,
  detailedDates,
  communityCreationDate,
} from '../features/experience-tools';
import { developerProducts, storeSaleFilter } from '../features/experience-store';
import {
  quietSidebar,
  transactionsLink,
  fullRobuxBalance,
  verifiedNavigationBadges,
} from '../features/navigation-tools';
import { idContextMenu } from '../features/id-context-menu';

export const featureRegistry = [
  copyUserIdFeature,
  copyPlaceIdFeature,
  copyAssetIdFeature,
  copyCommunityIdFeature,
  copyUniverseIdFeature,
  quickLinksFeature,
  ...websiteFeatures,
  ...websitePreferences,
  ...appearanceFeatures,
  ...pageLibraries,
  keyboardSearch,
  quietSidebar,
  quickPlay,
  widePlayerCounts,
  detailedDates,
  developerProducts,
  storeSaleFilter,
  communityCreationDate,
  fullRobuxBalance,
  transactionsLink,
  verifiedNavigationBadges,
  idContextMenu,
] as const;

export const websiteFeatureRegistry = featureRegistry.filter((feature) =>
  feature.supportedSites.some((site) => site === 'roblox'),
);

const validation = validateRegistry(featureRegistry, categories);
if (!validation.valid)
  throw new Error(`Invalid Creator Toolkit registry:\n${validation.errors.join('\n')}`);

export { categories };
export * from './types';
export * from './validation';
