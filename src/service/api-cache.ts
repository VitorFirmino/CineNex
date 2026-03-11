interface CacheEntry<T = unknown> {
  data: T;
  expiry: number;
}

const CACHE_CLEAR_BROADCAST_KEY = "stream-catalog:cache-clear";
const CACHE_PERSIST_PREFIX = "stream-catalog:cache:v1:";

let hits = 0;
let misses = 0;
const store = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
let version = 0;
let storageSyncInitialized = false;

function logCacheError(context: string, error: unknown): void {
  console.error(`[api-cache] ${context}`, error);
}

function emitVersionUpdate() {
  version++;
  for (const listener of listeners) listener();
}

function ensureCrossTabSync() {
  if (storageSyncInitialized || typeof window === "undefined") return;
  storageSyncInitialized = true;

  window.addEventListener("storage", (event) => {
    if (event.key !== CACHE_CLEAR_BROADCAST_KEY || !event.newValue) return;
    store.clear();
    clearPersistedEntries();
    hits = 0;
    misses = 0;
    emitVersionUpdate();
  });
}

function persistKey(key: string): string {
  return `${CACHE_PERSIST_PREFIX}${key}`;
}

function clearPersistedEntries(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(CACHE_PERSIST_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch (error) {
    logCacheError("Falha ao limpar entradas persistidas do cache.", error);
  }
}

function restoreFromPersistentCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(persistKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.expiry !== "number" || Date.now() > parsed.expiry) {
      window.localStorage.removeItem(persistKey(key));
      return null;
    }
    store.set(key, parsed);
    return parsed.data;
  } catch (error) {
    logCacheError(`Falha ao restaurar cache persistido para a chave "${key}".`, error);
    return null;
  }
}

function persistEntry<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(persistKey(key), JSON.stringify(entry));
  } catch (error) {
    logCacheError(`Falha ao persistir cache para a chave "${key}".`, error);
  }
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) {
    const restored = restoreFromPersistentCache<T>(key);
    if (restored !== null) {
      hits++;
      return restored;
    }
    misses++;
    return null;
  }
  if (Date.now() > entry.expiry) {
    store.delete(key);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(persistKey(key));
      } catch (error) {
        logCacheError(`Falha ao remover cache expirado para a chave "${key}".`, error);
      }
    }
    misses++;
    return null;
  }
  hits++;
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  const entry = {
    data,
    expiry: Date.now() + ttlMs,
  };
  store.set(key, entry);
  persistEntry(key, entry);
}

export function cacheClear(): void {
  store.clear();
  clearPersistedEntries();
  hits = 0;
  misses = 0;
  emitVersionUpdate();

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CACHE_CLEAR_BROADCAST_KEY, `${Date.now()}`);
    } catch (error) {
      logCacheError("Falha ao publicar evento de limpeza do cache entre abas.", error);
    }
  }
}

export function cacheSubscribe(listener: () => void) {
  ensureCrossTabSync();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function cacheGetVersion() {
  return version;
}

export function cacheStats() {
  return {
    entries: store.size,
    hits,
    misses,
  };
}

export const CACHE_TTL_MS = {
  groups: 600_000,
  list: 300_000,
  seriesDetails: 600_000,
  summary: 120_000,
} as const;
