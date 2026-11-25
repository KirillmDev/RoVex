import { categories } from './categories';
import { quickLinksFeature } from '../features/quick-links/quick-links';
import { copyAssetIdFeature } from '../features/marketplace/copy-asset-id';
import { copyCommunityIdFeature } from '../features/communities/copy-community-id';
import { copyPlaceIdFeature } from '../features/experiences/copy-place-id';
import { copyUniverseIdFeature } from '../features/experiences/copy-universe-id';
import { copyUserIdFeature } from '../features/profile/copy-user-id';
import { validateRegistry } from './validation';
import { websiteFeatures } from '../features/marketplace/bundle-id';
import { websitePreferences } from '../features/website-preferences';
import { appearanceFeatures } from '../features/customization/appearance';
import { pageLibraries } from '../features/page-library';
import { keyboardSearch } from '../features/navigation/keyboard-search';
import { widePlayerCounts, detailedDates } from '../features/experiences/experience-tools';
import { communityCreationDate } from '../features/communities/creation-date';
import { developerProducts, storeSaleFilter } from '../features/experiences/experience-store';
import {
  quietSidebar,
  transactionsLink,
  fullRobuxBalance,
} from '../features/navigation/navigation-tools';
import { idContextMenu } from '../features/developer/id-context-menu';
import { quickPlay } from '../features/experiences/quick-play';
import { verifiedNavigationBadges } from '../features/navigation/verified-badges';

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
