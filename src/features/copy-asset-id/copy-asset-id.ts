import { createIdCopyFeature, pathSegmentId } from '../shared/id-copy-feature';

export function extractAssetId(pathname: string): string | null {
  return (
    pathSegmentId(pathname, 'asset') ??
    pathSegmentId(pathname, 'catalog') ??
    pathSegmentId(pathname, 'library')
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
    { hostnames: ['create.roblox.com'], path: /^\/store\/asset\/\d+(?:\/|$)/i },
  ],
  extract: ({ pathname }) => extractAssetId(pathname),
});
