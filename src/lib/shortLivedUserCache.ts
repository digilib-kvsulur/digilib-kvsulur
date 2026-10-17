const CACHE_PREFIX = "dlms:short-cache:v1:";

interface CacheEntry<T> {
  cachedAt: number;
  value: T;
}

/** Small browser cache for read-heavy dashboard data. Failures never affect the app. */
export function readShortLivedCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!Number.isFinite(entry?.cachedAt) || Date.now() - entry.cachedAt >= ttlMs) return null;
    return entry.value ?? null;
  } catch {
    return null;
  }
}

export function writeShortLivedCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ cachedAt: Date.now(), value }));
  } catch {
    // Storage is only an optimization; private browsing/quota limits must not break the page.
  }
}

export function clearShortLivedCache(key: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // Ignore unavailable storage.
  }
}
