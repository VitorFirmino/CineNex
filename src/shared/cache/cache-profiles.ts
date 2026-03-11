export type CacheProfile =
  | "highlights"
  | "summary"
  | "groups"
  | "movies"
  | "series"
  | "seriesDetails";

export type CacheTTL = {
  stale: number;
  revalidate: number;
  expire: number;
};

const CACHE_TTLS: Record<CacheProfile, CacheTTL> = {
  highlights: { stale: 120, revalidate: 300, expire: 3600 },
  summary: { stale: 60, revalidate: 120, expire: 900 },
  groups: { stale: 120, revalidate: 300, expire: 1800 },
  movies: { stale: 60, revalidate: 120, expire: 900 },
  series: { stale: 60, revalidate: 120, expire: 900 },
  seriesDetails: { stale: 120, revalidate: 300, expire: 1800 },
};

export function getCacheTTL(profile: CacheProfile): CacheTTL {
  return CACHE_TTLS[profile];
}

export function buildCacheControl(profile: CacheProfile): string {
  const ttl = getCacheTTL(profile);
  return `public, s-maxage=${ttl.stale}, stale-while-revalidate=${ttl.revalidate}`;
}
