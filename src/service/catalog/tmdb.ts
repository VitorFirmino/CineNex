type TmdbType = "movie" | "tv";

export type TmdbMetadata = {
  source: "tmdb";
  tmdbId: number;
  type: TmdbType;
  title: string;
  overview: string;
  rating: number | null;
  voteCount: number | null;
  genres: string[];
  releaseDate: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  runtime: number | null;
  status: string | null;
  cast: string[];
};

export type TmdbTrendingItem = {
  id: number;
  type: "movie" | "tv";
  title: string;
  subtitle: string;
  overview: string;
  imageUrl: string | null;
  externalUrl: string;
};

type TmdbDetailsPayload = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  status?: string;
  credits?: {
    cast?: Array<{ name: string }>;
  };
};

function getHeaders(): HeadersInit | null {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  if (bearer) {
    return {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json;charset=utf-8",
    };
  }
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  return {
    "Content-Type": "application/json;charset=utf-8",
  };
}

export function hasTmdbCredentials(): boolean {
  return Boolean(process.env.TMDB_BEARER_TOKEN || process.env.TMDB_API_KEY);
}

function withApiKey(url: URL): URL {
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url;
}

function imageUrl(pathname: string | null | undefined, size: string): string | null {
  if (!pathname) return null;
  return `https://image.tmdb.org/t/p/${size}${pathname}`;
}

function mapTmdbDetailsToMetadata(
  details: TmdbDetailsPayload,
  params: { title: string; type: TmdbType },
): TmdbMetadata {
  const cast = (details.credits?.cast || [])
    .slice(0, 5)
    .map((person) => person.name);

  const runtime = details.runtime || (details.episode_run_time?.[0] || null);

  return {
    source: "tmdb",
    tmdbId: details.id,
    type: params.type,
    title: details.title || details.name || params.title,
    overview: details.overview || "",
    rating:
      typeof details.vote_average === "number"
        ? Number(details.vote_average.toFixed(1))
        : null,
    voteCount:
      typeof details.vote_count === "number" ? details.vote_count : null,
    genres: (details.genres || []).map((genre) => genre.name),
    releaseDate: details.release_date || details.first_air_date || null,
    posterUrl: imageUrl(details.poster_path, "w780"),
    backdropUrl: imageUrl(details.backdrop_path, "w1280"),
    runtime,
    status: details.status || null,
    cast,
  };
}

function isGoodMatch(original: string, candidate: string): boolean {
  const normOrig = original.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normCand = candidate.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normCand.includes(normOrig) || normOrig.includes(normCand);
}

export async function fetchTmdbMetadata(params: {
  title: string;
  type: TmdbType;
  year?: number | null;
  language?: string;
}): Promise<TmdbMetadata | null> {
  const headers = getHeaders();
  if (!headers) return null;

  const q = params.title.trim();
  if (!q) return null;

  const lang = params.language || "pt-BR";
  const searchUrl = withApiKey(
    new URL(`https://api.themoviedb.org/3/search/${params.type}`),
  );
  searchUrl.searchParams.set("query", q);
  searchUrl.searchParams.set("language", lang);
  if (params.year && params.type === "movie") {
    searchUrl.searchParams.set("year", String(params.year));
  }
  if (params.year && params.type === "tv") {
    searchUrl.searchParams.set("first_air_date_year", String(params.year));
  }

  const searchResponse = await fetch(searchUrl, {
    method: "GET",
    headers,
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!searchResponse.ok) return null;
  const searchPayload = (await searchResponse.json()) as {
    results?: Array<{
      id: number;
      name?: string;
      title?: string;
      release_date?: string;
      first_air_date?: string;
    }>;
  };
  
  if (!searchPayload.results || searchPayload.results.length === 0) return null;

  const bestMatch = searchPayload.results.find(res => {
    const candTitle = res.title || res.name || "";
    return isGoodMatch(q, candTitle);
  }) || searchPayload.results[0];

  const detailsUrl = withApiKey(
    new URL(`https://api.themoviedb.org/3/${params.type}/${bestMatch.id}`),
  );
  detailsUrl.searchParams.set("language", lang);
  detailsUrl.searchParams.set("append_to_response", "credits");

  const detailsResponse = await fetch(detailsUrl, {
    method: "GET",
    headers,
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!detailsResponse.ok) return null;
  const details = (await detailsResponse.json()) as TmdbDetailsPayload;
  return mapTmdbDetailsToMetadata(details, { title: params.title, type: params.type });
}

export async function fetchTmdbMetadataById(params: {
  tmdbId: number;
  type: TmdbType;
  language?: string;
}): Promise<TmdbMetadata | null> {
  const headers = getHeaders();
  if (!headers) return null;

  const lang = params.language || "pt-BR";
  const detailsUrl = withApiKey(
    new URL(`https://api.themoviedb.org/3/${params.type}/${params.tmdbId}`),
  );
  detailsUrl.searchParams.set("language", lang);
  detailsUrl.searchParams.set("append_to_response", "credits");

  const detailsResponse = await fetch(detailsUrl, {
    method: "GET",
    headers,
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!detailsResponse.ok) return null;
  const details = (await detailsResponse.json()) as TmdbDetailsPayload;
  return mapTmdbDetailsToMetadata(details, { title: String(params.tmdbId), type: params.type });
}

export async function fetchTmdbTrending(
  params?: { language?: string; limit?: number },
): Promise<TmdbTrendingItem[]> {
  const headers = getHeaders();
  if (!headers) return [];

  const language = params?.language || "pt-BR";
  const limit = Math.max(1, Math.min(params?.limit || 20, 40));
  const url = withApiKey(new URL("https://api.themoviedb.org/3/trending/all/day"));
  url.searchParams.set("language", language);

  const response = await fetch(url, {
    method: "GET",
    headers,
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) return [];
  const payload = (await response.json()) as {
    results?: Array<{
      id: number;
      media_type: "movie" | "tv" | "person";
      title?: string;
      name?: string;
      overview?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
    }>;
  };

  return (payload.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, limit)
    .map((item) => {
      const type = item.media_type === "movie" ? "movie" : "tv";
      const title = item.title || item.name || "Sem título";
      const date = item.release_date || item.first_air_date || "";
      const year = date ? date.slice(0, 4) : "";
      return {
        id: item.id,
        type,
        title,
        subtitle: year ? `${type === "movie" ? "Filme" : "Série"} • ${year}` : type === "movie" ? "Filme" : "Série",
        overview: item.overview || "",
        imageUrl: imageUrl(item.backdrop_path || item.poster_path || null, "w1280"),
        externalUrl: `https://www.themoviedb.org/${type}/${item.id}`,
      };
    });
}
