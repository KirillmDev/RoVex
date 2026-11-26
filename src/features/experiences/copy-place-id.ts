import { createIdCopyFeature, pathSegmentId } from '../shared/id-copy-feature';

export function extractPlaceId(pathname: string): string | null {
  return pathSegmentId(pathname, 'places') ?? pathSegmentId(pathname, 'games');
}

export const copyPlaceIdFeature = createIdCopyFeature({
  id: 'copy-place-id',
  category: 'experiences',
  title: 'Copy Place ID',
  description: 'Shows and copies the Place ID on Roblox game and Creator Hub place pages.',
  availability: 'Appears on Roblox game pages and Creator Hub place configuration pages.',
  idLabel: 'Place ID',
  supportedSites: ['roblox', 'creator-hub'],
  routes: [
    {
      hostnames: ['www.roblox.com'],
      path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/\d+(?:\/|$)/i,
    },
    {
      hostnames: ['create.roblox.com'],
      path: /^\/dashboard\/creations\/experiences\/\d+\/places\/\d+(?:\/|$)/i,
    },
  ],
  extract: ({ pathname }) => extractPlaceId(pathname),
});
