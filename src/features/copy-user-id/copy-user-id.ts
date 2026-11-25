import { createIdCopyFeature, pathSegmentId } from '../shared/id-copy-feature';

export function extractUserId(pathname: string): string | null {
  return pathSegmentId(pathname, 'users') ?? pathSegmentId(pathname, 'banned-users');
}

export const copyUserIdFeature = createIdCopyFeature({
  id: 'copy-user-id',
  category: 'profiles',
  title: 'Copy User ID',
  description: 'Shows and copies the numeric User ID on Roblox profile pages.',
  availability: 'Appears on Roblox user profile pages.',
  idLabel: 'User ID',
  supportedSites: ['roblox'],
  routes: [
    {
      hostnames: ['www.roblox.com'],
      path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:users|banned-users)\/\d+\/profile(?:\/|$)/i,
    },
  ],
  extract: ({ pathname }) => extractUserId(pathname),
});
