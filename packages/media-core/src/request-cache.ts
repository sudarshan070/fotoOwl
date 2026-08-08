interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class RequestCache {
  private ttlMs: number;
  private inFlight = new Map<string, Promise<unknown>>();
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    const promise = fetcher()
      .then((value) => {
        this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        this.inFlight.delete(key);
        return value;
      })
      .catch((error) => {
        this.inFlight.delete(key);
        throw error;
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}
