export type OmdbMetadata = {
  source: "omdb";
  title: string;
  year: string;
  rated: string;
  released: string;
  runtime: string;
  genre: string;
  director: string;
  writer: string;
  actors: string;
  plot: string;
  language: string;
  country: string;
  awards: string;
  poster: string;
  ratings: Array<{ Source: string; Value: string }>;
  metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbId: string;
  type: string;
  dvd?: string;
  boxOffice?: string;
  production?: string;
  website?: string;
};

const OMDB_BASE_URL = "https://www.omdbapi.com/";
let omdbDisabledReason: string | null = null;
let warnedMissingApiKey = false;

function buildOmdbUrl(apiKey: string): URL {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  return url;
}

function normalizeError(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function disableOmdb(reason: string): void {
  if (omdbDisabledReason) return;
  omdbDisabledReason = reason;
  console.info(`[OMDB] Disabled: ${reason}`);
}

export async function fetchOmdbMetadata(params: {
  title: string;
  year?: number | null;
}): Promise<OmdbMetadata | null> {
  if (omdbDisabledReason) return null;

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    if (!warnedMissingApiKey) {
      warnedMissingApiKey = true;
      console.info("[OMDB] OMDB_API_KEY not configured; skipping OMDb enrichment.");
    }
    return null;
  }

  const url = buildOmdbUrl(apiKey);
  url.searchParams.set("t", params.title);
  if (params.year) {
    url.searchParams.set("y", String(params.year));
  }

  try {
    const response = await fetch(url.href, {
      next: { revalidate: 60 * 60 * 24 },
    });

    let data = await response.json();
    const apiError = normalizeError((data as { Error?: unknown })?.Error);

    if (response.status === 401 || apiError.toLowerCase().includes("invalid api key")) {
      disableOmdb(`Unauthorized (401). ${apiError || "Check OMDB_API_KEY activation and value."}`);
      return null;
    }

    if (!response.ok) {
      console.info(`[OMDB] HTTP ${response.status}${apiError ? `: ${apiError}` : ""}`);
      return null;
    }

    if (data.Response === "False") {
      const searchUrl = buildOmdbUrl(apiKey);
      searchUrl.searchParams.set("s", params.title);
      if (params.year) searchUrl.searchParams.set("y", String(params.year));

      const searchRes = await fetch(searchUrl.href);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.Response === "True" && searchData.Search?.[0]?.imdbID) {
          const idUrl = buildOmdbUrl(apiKey);
          idUrl.searchParams.set("i", searchData.Search[0].imdbID);
          const idRes = await fetch(idUrl.href);
          if (idRes.ok) data = await idRes.json();
        }
      }
    }

    if (data.Response === "False") {
      return null;
    }

    return {
      source: "omdb",
      title: data.Title,
      year: data.Year,
      rated: data.Rated,
      released: data.Released,
      runtime: data.Runtime,
      genre: data.Genre,
      director: data.Director,
      writer: data.Writer,
      actors: data.Actors,
      plot: data.Plot,
      language: data.Language,
      country: data.Country,
      awards: data.Awards,
      poster: data.Poster,
      ratings: data.Ratings,
      metascore: data.Metascore,
      imdbRating: data.imdbRating,
      imdbVotes: data.imdbVotes,
      imdbId: data.imdbID,
      type: data.Type,
      dvd: data.DVD,
      boxOffice: data.BoxOffice,
      production: data.Production,
      website: data.Website,
    };
  } catch (error) {
    console.info("Failed to fetch OMDb metadata:", error);
    return null;
  }
}
