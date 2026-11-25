import { describe, expect, it } from 'vitest';
import { routeMatches, snapshotRoute } from '../src/navigation/routes';
import { siteFromHostname } from '../src/sites/site';

describe('multi-site route matching', () => {
  it('distinguishes both supported adapters', () => {
    expect(siteFromHostname('www.roblox.com')).toBe('roblox');
    expect(siteFromHostname('create.roblox.com')).toBe('creator-hub');
    expect(siteFromHostname('example.com')).toBeNull();
  });

  it('includes relevant query and hash changes in route matching', () => {
    const route = snapshotRoute({
      hostname: 'www.roblox.com',
      pathname: '/my/account',
      search: '?creatorToolkit=settings',
      hash: '#section',
    });
    expect(
      routeMatches(
        {
          hostnames: ['www.roblox.com'],
          path: /^\/my\/account$/,
          query: { creatorToolkit: 'settings' },
          hash: /^#section$/,
        },
        route,
      ),
    ).toBe(true);
  });
});
