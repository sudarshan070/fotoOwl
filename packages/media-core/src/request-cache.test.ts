import { describe, it, expect, vi } from 'vitest';
import { RequestCache } from './request-cache';

describe('RequestCache', () => {
  it('returns the same in-flight promise for concurrent identical keys instead of calling fetcher twice', async () => {
    const cache = new RequestCache();
    const fetcher = vi.fn().mockResolvedValue('result');

    const [a, b] = await Promise.all([
      cache.getOrFetch('key-1', fetcher),
      cache.getOrFetch('key-1', fetcher)
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toBe('result');
    expect(b).toBe('result');
  });

  it('re-fetches once the TTL has expired', async () => {
    vi.useFakeTimers();
    const cache = new RequestCache(1_000);
    const fetcher = vi.fn().mockResolvedValue('result');

    await cache.getOrFetch('key-1', fetcher);
    vi.advanceTimersByTime(1_001);
    await cache.getOrFetch('key-1', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
