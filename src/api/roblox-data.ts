export const robloxId = (value: unknown): string | null => {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return /^[1-9]\d{0,19}$/.test(String(value)) ? String(value) : null;
};

export type DataKind =
  | 'universe'
  | 'games'
  | 'products'
  | 'passes'
  | 'icons'
  | 'community'
  | 'balance'
  | 'user'
  | 'self';

export type RobloxErrorCode = 'invalid' | 'restricted' | 'rate-limit' | 'unavailable';
export class RobloxApiError extends Error {
  constructor(readonly code: RobloxErrorCode) {
    super(`Roblox data: ${code}`);
  }
}

export type RobloxResponses = {
  universe: { universeId?: number | string };
  games: { data?: { id: number; playing?: number; created?: string; updated?: string }[] };
  products: {
    developerProducts?: unknown[];
    DeveloperProducts?: unknown[];
    nextPageCursor?: string;
    NextPageCursor?: string;
  };
  passes: { gamePasses?: unknown[]; nextPageToken?: string };
  icons: { data?: { targetId: number; imageUrl?: string }[] };
  community: { data?: { id: number; created?: string }[] };
  balance: { robux?: number };
  user: { id?: number | string; name?: string; displayName?: string; hasVerifiedBadge?: boolean };
  self: { id?: number | string; name?: string; displayName?: string };
};

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
    case 'self':
      return {
        url: new URL('https://users.roblox.com/v1/users/authenticated'),
        credentials: 'include',
        ttl: 0,
      };
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
            `https://apis.roblox.com/developer-products/v2/universes/${id}/developerproducts?limit=100${page ? `&cursor=${encodeURIComponent(page)}` : ''}`,
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

async function requestData<T>(
  kind: DataKind,
  id: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  let cancel: (() => void) | undefined;
  const request = chrome.runtime.sendMessage({ type: 'rovex.data', kind, id, cursor });
  try {
    const response = signal
      ? await Promise.race([
          request,
          new Promise<never>((_, reject) => {
            cancel = () => reject(signal.reason);
            signal.addEventListener('abort', cancel, { once: true });
          }),
        ])
      : await request;
    if (!response?.ok) {
      const code = response?.code;
      throw new RobloxApiError(
        code === 'restricted' || code === 'rate-limit' || code === 'invalid' ? code : 'unavailable',
      );
    }
    return response.data as T;
  } finally {
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}

export function robloxApi<K extends DataKind>(
  kind: K,
  id: string,
  options: { cursor?: string; signal?: AbortSignal } = {},
) {
  return requestData<RobloxResponses[K]>(kind, id, options.cursor, options.signal);
}

export async function universeForPlace(id: string, signal?: AbortSignal): Promise<string> {
  const result = await robloxApi('universe', id, { signal });
  const universe = robloxId(result?.universeId);
  if (!universe) throw new Error('Universe ID unavailable');
  return universe;
}

export const experiencePath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/([1-9]\d*)(?:\/|$)/i;
export const communityPath =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:communities|groups)\/([1-9]\d*)(?:\/|$)/i;

export function signedInUser(): string | null {
  const meta = document.querySelector<HTMLElement>('meta[name="user-data"]');
  return robloxId(meta?.dataset.userid ?? meta?.dataset.userId);
}
