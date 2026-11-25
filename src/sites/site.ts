import type { SiteId } from '../registry/types';

export function siteFromHostname(hostname: string): SiteId | null {
  switch (hostname.toLowerCase()) {
    case 'www.roblox.com':
      return 'roblox';
    case 'create.roblox.com':
      return 'creator-hub';
    default:
      return null;
  }
}
