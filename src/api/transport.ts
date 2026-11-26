import { RobloxApiError, robloxEndpoint } from './roblox-data';
import { publicServerPage } from './server-directory';

const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
const throttled = new Map<string, number>();

export async function readRobloxData(
  kind: unknown,
  id: unknown,
  cursor?: unknown,
): Promise<unknown> {
  const endpoint = robloxEndpoint(kind, id, cursor);
  if (!endpoint) throw new RobloxApiError('invalid');
  const { url, credentials, ttl } = endpoint;
  const key = url.href;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (cached) cache.delete(key);
  const existing = pending.get(key);
  if (existing) return existing;
  if ((throttled.get(url.origin) ?? 0) > Date.now()) throw new RobloxApiError('rate-limit');
  if (pending.size >= 24) throw new RobloxApiError('unavailable');
  const request = (async () => {
    const signal = AbortSignal.timeout(10_000);
    const fetchOnce = () =>
      fetch(url, {
        credentials,
        redirect: 'error',
        signal,
      });
    let response = await fetchOnce();
    if ([502, 503, 504].includes(response.status)) {
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      signal.throwIfAborted();
      response = await fetchOnce();
    }
    if (response.status === 429) {
      const retry = Number(response.headers.get('retry-after')) || 30;
      throttled.set(url.origin, Date.now() + Math.min(300, Math.max(10, retry)) * 1000);
      throw new RobloxApiError('rate-limit');
    }
    if (response.status === 401 || response.status === 403) throw new RobloxApiError('restricted');
    if (!response.ok) throw new RobloxApiError('unavailable');
    const body: unknown = await response.json();
    const value = kind === 'public-servers' ? publicServerPage(body) : body;
    cache.delete(key);
    if (ttl) cache.set(key, { value, expires: Date.now() + ttl });
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
