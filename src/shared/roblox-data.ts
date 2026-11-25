export const robloxId = (value: unknown): string | null => {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return /^[1-9]\d{0,19}$/.test(String(value)) ? String(value) : null;
};

export type DataKind =
  'universe' | 'games' | 'products' | 'passes' | 'icons' | 'community' | 'balance' | 'user';

type Endpoint = { url: URL; credentials: RequestCredentials; ttl: number };

export function robloxEndpoint(kind: unknown, value: unknown, cursor?: unknown): Endpoint | null {
  const id = robloxId(value);
  const ids = typeof value === 'string' && value.length <= 2100 ? value.split(',') : [];
  const list = ids.length && ids.length <= 100 && ids.every(robloxId) ? ids.join(',') : null;
  const publicData = (url: string, ttl = 300_000): Endpoint => ({
    url: new URL(url),
    credentials: 'omit',
    ttl,
  });
  const page = typeof cursor === 'string' && cursor.length <= 1024 ? cursor : '';
  switch (kind) {
    case 'universe':
      return id
        ? publicData(`https://apis.roblox.com/universes/v1/places/${id}/universe`, 3600_000)
        : null;
    case 'games':
      return list
        ? publicData(`https://games.roblox.com/v1/games?universeIds=${list}`, 60_000)
        : null;
    case 'products':
      return id
        ? publicData(
            `https://apis.roblox.com/developer-products/v2/universes/${id}/developerproducts?limit=100&cursor=${encodeURIComponent(page)}`,
          )
        : null;
    case 'passes':
      return id
        ? publicData(
            `https://apis.roblox.com/game-passes/v1/universes/${id}/game-passes?pageSize=50&passView=Full&pageToken=${encodeURIComponent(page)}`,
          )
        : null;
    case 'icons':
      return list
        ? publicData(
            `https://thumbnails.roblox.com/v1/assets?assetIds=${list}&size=150x150&format=Png&isCircular=false`,
            3600_000,
          )
        : null;
    case 'community':
      return id ? publicData(`https://groups.roblox.com/v2/groups?groupIds=${id}`, 3600_000) : null;
    case 'user':
      return id ? publicData(`https://users.roblox.com/v1/users/${id}`, 300_000) : null;
    case 'balance':
      return id
        ? {
            url: new URL(`https://economy.roblox.com/v1/users/${id}/currency`),
            credentials: 'include',
            ttl: 30_000,
          }
        : null;
    default:
      return null;
  }
}

export async function requestData<T>(kind: DataKind, id: string, cursor?: string): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type: 'rovex.data', kind, id, cursor });
  if (!response?.ok) throw new Error('Roblox data unavailable');
  return response.data as T;
}

export async function universeForPlace(id: string): Promise<string> {
  const result = await requestData<{ universeId?: number }>('universe', id);
  const universe = robloxId(result?.universeId);
  if (!universe) throw new Error('Universe ID unavailable');
  return universe;
}

export const experiencePath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/([1-9]\d*)(?:\/|$)/i;
export const communityPath =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:communities|groups)\/([1-9]\d*)(?:\/|$)/i;

export function signedInUser(): string | null {
  return robloxId(document.querySelector<HTMLElement>('meta[name="user-data"]')?.dataset.userid);
}
