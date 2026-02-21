import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory fallback cache
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function ensureCacheDir(): Promise<boolean> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function getCachePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

export async function getCached<T>(key: string): Promise<T | null> {
  // Try file cache first
  try {
    const cachePath = getCachePath(key);
    const raw = await fs.readFile(cachePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);

    if (Date.now() - entry.timestamp < TTL_MS) {
      return entry.data;
    }
  } catch {
    // File cache miss, try memory
  }

  // Try memory cache
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < TTL_MS) {
    return memEntry.data as T;
  }

  return null;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  const timestamp = Date.now();

  // Always set memory cache
  memoryCache.set(key, { data, timestamp });

  // Try file cache
  const dirOk = await ensureCacheDir();
  if (dirOk) {
    try {
      const cachePath = getCachePath(key);
      const entry: CacheEntry<T> = { data, timestamp };
      await fs.writeFile(cachePath, JSON.stringify(entry), 'utf-8');
    } catch {
      // File write failed, memory cache is still valid
    }
  }
}

export async function clearCache(key?: string): Promise<void> {
  if (key) {
    memoryCache.delete(key);
    try {
      await fs.unlink(getCachePath(key));
    } catch {
      // ignore
    }
  } else {
    memoryCache.clear();
    try {
      const files = await fs.readdir(CACHE_DIR);
      await Promise.all(
        files.map((f) => fs.unlink(path.join(CACHE_DIR, f)).catch(() => {}))
      );
    } catch {
      // ignore
    }
  }
}
