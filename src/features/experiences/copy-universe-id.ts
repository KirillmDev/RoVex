import { createIdCopyFeature, pathSegmentId } from '../shared/id-copy-feature';

export function extractUniverseId(pathname: string, searchParams: URLSearchParams): string | null {
  const queryId = searchParams.get('universeId');
  if (queryId && /^\d+$/.test(queryId)) return queryId;
  return pathSegmentId(pathname, 'experiences');
}

export const copyUniverseIdFeature = createIdCopyFeature({
  id: 'copy-universe-id',
  category: 'creations',
  title: 'Copy Universe ID',
  description: 'Shows and copies the Universe ID throughout an experience’s Creator Hub pages.',
  availability: 'Appears inside a specific experience in Creator Hub.',
  idLabel: 'Universe ID',
  supportedSites: ['creator-hub'],
  routes: [
    {
      hostnames: ['create.roblox.com'],
      path: /^\/dashboard\/creations\/experiences\/\d+(?:\/|$)/i,
    },
  ],
  extract: ({ pathname, searchParams }) => extractUniverseId(pathname, searchParams),
});
