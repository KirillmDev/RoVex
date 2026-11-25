import type { RouteRule, RouteSnapshot } from '../registry/types';

export function snapshotRoute(
  location: Pick<Location, 'hostname' | 'pathname' | 'search' | 'hash'>,
): RouteSnapshot {
  return {
    hostname: location.hostname.toLowerCase(),
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    searchParams: new URLSearchParams(location.search),
  };
}

export function routeMatches(rule: RouteRule, route: RouteSnapshot): boolean {
  if (!rule.hostnames.map((host) => host.toLowerCase()).includes(route.hostname)) return false;
  if (rule.path && !rule.path.test(route.pathname)) return false;
  if (rule.hash && !rule.hash.test(route.hash)) return false;
  for (const [key, expected] of Object.entries(rule.query ?? {})) {
    if (expected === true && !route.searchParams.has(key)) return false;
    if (typeof expected === 'string' && route.searchParams.get(key) !== expected) return false;
  }
  return true;
}
