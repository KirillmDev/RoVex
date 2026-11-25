import { robloxEndpoint } from '../shared/roblox-data';

const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
const throttled = new Map<string, number>();

export async function readRobloxData(
  kind: unknown,
  id: unknown,
  cursor?: unknown,
): Promise<unknown> {
  const endpoint = robloxEndpoint(kind, id, cursor);
  if (!endpoint) throw new Error('Unsupported data request');
  const { url, credentials, ttl } = endpoint;
  const key = url.href;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const existing = pending.get(key);
  if (existing) return existing;
  if ((throttled.get(url.origin) ?? 0) > Date.now() || pending.size >= 24)
    throw new Error('Roblox data temporarily unavailable');
  const request = (async () => {
    const response = await fetch(url, {
      credentials,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) {
      const retry = Number(response.headers.get('retry-after')) || 30;
      throttled.set(url.origin, Date.now() + Math.min(300, Math.max(10, retry)) * 1000);
    }
    if (!response.ok) throw new Error(`Roblox returned ${response.status}`);
    const value: unknown = await response.json();
    cache.delete(key);
    cache.set(key, { value, expires: Date.now() + ttl });
    if (cache.size > 256) cache.delete(cache.keys().next().value!);
    return value;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}
