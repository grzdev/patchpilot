import type { Scan } from "./scan-types";

type CacheEntry = {
  scan: Scan;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 100;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function scanCacheKey(
  repo: string,
  commit: string,
  focus: string,
  kinds: string[],
  pace: string,
  batchIndex = 0,
  skipFiles: string[] = []
): string {
  return JSON.stringify(["review-v2-groq-openrouter",repo.toLowerCase(),commit,focus,[...new Set(kinds)].sort(),pace,batchIndex,[...new Set(skipFiles)].sort()]);
}

export function getCachedScan(key: string, now = Date.now()): Scan | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.scan;
}

export function setCachedScan(
  key: string,
  scan: Scan,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now()
): void {
  if (cache.size >= MAX_ENTRIES) {
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
    if (cache.size >= MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
  }
  cache.set(key, { scan, expiresAt: now + ttlMs });
}

export function clearScanCache(): void {
  cache.clear();
}
