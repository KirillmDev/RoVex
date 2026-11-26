export type PublicServer = { id: string; playing: number; maxPlayers: number };
export type ServerPage = { data: PublicServer[]; nextPageCursor: string | null };

export type ServerDirectory = (
  place: string,
  options: { cursor?: string; signal: AbortSignal },
) => Promise<ServerPage>;

export function publicServerPage(value: unknown): ServerPage {
  if (!value || typeof value !== 'object') throw new Error('Invalid server list');
  const { data, nextPageCursor } = value as Record<string, unknown>;
  if (!Array.isArray(data)) throw new Error('Invalid server list');
  const servers = data.flatMap((entry: unknown): PublicServer[] => {
    if (!entry || typeof entry !== 'object') return [];
    const { id, playing, maxPlayers } = entry as Record<string, unknown>;
    if (
      typeof id !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ||
      typeof playing !== 'number' ||
      !Number.isSafeInteger(playing) ||
      playing < 0 ||
      typeof maxPlayers !== 'number' ||
      !Number.isSafeInteger(maxPlayers) ||
      maxPlayers < 1
    )
      return [];
    return [{ id, playing, maxPlayers }];
  });
  if (data.length && !servers.length) throw new Error('Invalid server entries');
  return {
    data: servers,
    nextPageCursor:
      typeof nextPageCursor === 'string' && nextPageCursor.length <= 1024 ? nextPageCursor : null,
  };
}
