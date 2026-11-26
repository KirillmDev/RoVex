import { createIdCopyFeature } from '../shared/id-copy-feature';
import { robloxId } from '../../api/roblox-data';
import { marketplaceDetailPath } from './item-page';

const creatorAssetPath = /^\/store\/asset\/([1-9]\d*)(?:\/|$)/i;
const legacyAssetPath = /^\/(?:asset\/?|asset\.aspx)$/i;

export function extractAssetId(pathname: string): string | null {
  const match = marketplaceDetailPath.exec(pathname);
  return robloxId(
    creatorAssetPath.exec(pathname)?.[1] ??
      (match?.[1].toLowerCase() === 'bundles' ? null : match?.[2]),
  );
}

export const copyAssetIdFeature = createIdCopyFeature({
  id: 'copy-asset-id',
  category: 'marketplace',
  title: 'Copy Asset ID',
  description: 'Shows and copies the ID on Creator Store, catalog, and library asset pages.',
  availability: 'Appears on Creator Store asset pages and Roblox catalog or library item pages.',
  idLabel: 'Asset ID',
  supportedSites: ['roblox', 'creator-hub'],
  routes: [
    {
      hostnames: ['www.roblox.com'],
      path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:catalog|library)\/\d+(?:\/|$)/i,
    },
    { hostnames: ['www.roblox.com'], path: legacyAssetPath, query: { id: true } },
    { hostnames: ['create.roblox.com'], path: creatorAssetPath },
  ],
  extract: ({ pathname, searchParams }) =>
    legacyAssetPath.test(pathname) ? robloxId(searchParams.get('id')) : extractAssetId(pathname),
});
