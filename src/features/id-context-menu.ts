import type { FeatureDefinition } from '../registry/types';
import { robloxId } from '../shared/roblox-data';

const locale = '(?:[a-z]{2}(?:-[a-z]{2})?/)?';
export const idLinkTypes = [
  { key: 'user', title: 'User', paths: ['users'] },
  { key: 'place', title: 'Place', paths: ['games'] },
  { key: 'universe', title: 'Universe', paths: ['universes', 'games'] },
  { key: 'community', title: 'Community', paths: ['communities', 'groups'] },
  { key: 'asset', title: 'Asset', paths: ['catalog', 'library'] },
  { key: 'bundle', title: 'Bundle', paths: ['bundles'] },
  { key: 'pass', title: 'Game Pass', paths: ['game-pass'] },
  { key: 'badge', title: 'Badge', paths: ['badges'] },
] as const;

export function idFromLink(
  link: string,
  key: string,
): { id: string; resolveUniverse: boolean } | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.origin !== 'https://www.roblox.com' || url.username || url.password) return null;
  const definition = idLinkTypes.find((item) => item.key === key);
  if (!definition) return null;
  const match = new RegExp(`^/${locale}(${definition.paths.join('|')})/(\\d+)(?:/|$)`, 'i').exec(
    url.pathname,
  );
  const id = robloxId(match?.[2]);
  return id
    ? { id, resolveUniverse: key === 'universe' && match?.[1].toLowerCase() === 'games' }
    : null;
}

export const idContextMenu: FeatureDefinition = {
  id: 'copy-id-context-menu',
  category: 'roblox-developer',
  title: 'Copy ID from links',
  description:
    'Copy Roblox identifiers from the browser’s link context menu. Universe IDs are resolved separately from Place IDs.',
  availability: 'Supported links on the Roblox website.',
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'] }],
  defaultEnabled: false,
  settings: [],
  activate() {},
};
