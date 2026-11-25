import { createIdCopyFeature, pathSegmentId } from '../shared/id-copy-feature';

export function extractCommunityId(pathname: string, searchParams: URLSearchParams): string | null {
  const routeId = pathSegmentId(pathname, 'communities') ?? pathSegmentId(pathname, 'groups');
  if (routeId) return routeId;
  const queryId = searchParams.get('id');
  return queryId && /^\d+$/.test(queryId) ? queryId : null;
}

export const copyCommunityIdFeature = createIdCopyFeature({
  id: 'copy-community-id',
  category: 'communities',
  title: 'Copy Community ID',
  description: 'Shows and copies the Community ID on community and legacy group pages.',
  availability: 'Appears on Roblox community, group, and community configuration pages.',
  idLabel: 'Community ID',
  supportedSites: ['roblox'],
  routes: [
    {
      hostnames: ['www.roblox.com'],
      path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:communities|groups)\/\d+(?:\/|$)/i,
    },
    {
      hostnames: ['www.roblox.com'],
      path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:communities|groups)\/configure\/?$/i,
      query: { id: true },
    },
  ],
  extract: ({ pathname, searchParams }) => extractCommunityId(pathname, searchParams),
});
