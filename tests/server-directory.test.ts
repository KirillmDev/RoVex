import { describe, expect, it } from 'vitest';
import { robloxEndpoint } from '../src/api/roblox-data';
import { publicServerPage } from '../src/api/server-directory';

describe('public server directory', () => {
  it('allows only a fixed public data endpoint and encodes its cursor', () => {
    expect(robloxEndpoint('public-servers', '42/Private')).toBeNull();
    const endpoint = robloxEndpoint('public-servers', '42', 'next&limit=100')!;
    expect(endpoint.credentials).toBe('omit');
    expect(endpoint.url.pathname).toBe('/v1/games/42/servers/Public');
    expect(endpoint.url.searchParams.get('limit')).toBe('25');
    expect(endpoint.url.searchParams.get('cursor')).toBe('next&limit=100');
  });

  it('discards identifiers and attributes unrelated to public occupancy', () => {
    const id = '0a000000-1234-1234-1234-123456789abc';
    expect(
      publicServerPage({
        data: [
          { id, playing: 2, maxPlayers: 10, playerTokens: ['test'], players: ['test'], ping: 20 },
          { id: 'unexpected', playing: 1, maxPlayers: 10 },
        ],
        nextPageCursor: 'page-two',
      }),
    ).toEqual({ data: [{ id, playing: 2, maxPlayers: 10 }], nextPageCursor: 'page-two' });
    expect(() => publicServerPage({ data: [{ id }] })).toThrow('Invalid server entries');
  });
});
