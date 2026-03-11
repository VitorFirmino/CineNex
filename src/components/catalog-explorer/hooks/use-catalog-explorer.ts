"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@hooks/use-auth";
import { authApi } from "@infrastructure/api/auth-api";
import { getCatalogGroups, listCatalog } from "@infrastructure/api/catalog-api";
import { isRequestCanceledError } from "@infrastructure/http/axios-client";
import { CACHE_TTL_MS } from "@services/api-cache";
import { cleanTitleForSearch } from "@shared/utils";
import type {
  CatalogType,
  GroupCount,
  MovieItem,
  PaginationResult,
  SeriesIndexItem,
} from "@shared/types/catalog-types";
import type { HighlightItem, HighlightRow, HomeHighlights } from "@shared/types/highlights-types";
import type { CarouselApi } from "@components/ui/carousel";
import { useCatalogStore, type ViewMode } from "@store/catalog-store";
import { useCatalogFilters } from "./use-catalog-filters";

export type { ViewMode } from "@store/catalog-store";

export type CatalogListItem = MovieItem | SeriesIndexItem;
export type CatalogItem = CatalogListItem;

export type RecentWatchItem = {
  id: string;
  contentType: "movies" | "series";
  contentId: string;
  episodeId: string | null;
  title: string | null;
  posterUrl: string | null;
  playHref: string;
  progressPct: number | null;
  completed: boolean;
};

export const COLLECTION_ROUTE_BY_TAB: Record<CatalogType, string> = {
  movies: "/collection/movies",
  series: "/collection/series",
};

export function buildPagination(current: number, total: number): number[] {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i > 1 && i < total) pages.add(i);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function getListTitle(item: CatalogListItem): string {
  return cleanTitleForSearch(item.title || "").toLowerCase();
}

function getQualityRank(value: string | null | undefined): number {
  const normalized = (value || "").toUpperCase().trim();
  if (!normalized) return 1;
  if (normalized.includes("SD")) return 0;
  if (normalized === "HD") return 2;
  if (normalized.includes("FHD") || normalized.includes("1080")) return 3;
  if (normalized.includes("2K") || normalized.includes("QHD")) return 4;
  if (normalized.includes("4K") || normalized.includes("UHD")) return 5;
  if (normalized.includes("8K")) return 6;
  return 2;
}

function itemDedupeScore(item: CatalogListItem): number {
  const quality = "quality" in item ? getQualityRank(item.quality) : 0;
  return (item.posterUrl ? 8 : 0) + (item.logoUrl ? 3 : 0) + quality;
}

export function dedupeCatalogItems(items: CatalogListItem[], tab: CatalogType): CatalogListItem[] {
  const chosen = new Map<string, CatalogListItem>();

  for (const item of items) {
    const title = getListTitle(item);
    const group = cleanTitleForSearch(item.groupTitle || "").toLowerCase();
    const year = "year" in item && item.year ? String(item.year) : "";
    const dedupeKey =
      tab === "series"
        ? `series|${title}|${group}`
        : `${tab}|${title}|${group}|${year}`;

    const existing = chosen.get(dedupeKey);
    if (!existing) {
      chosen.set(dedupeKey, item);
      continue;
    }

    const existingScore = itemDedupeScore(existing);
    const currentScore = itemDedupeScore(item);

    if (
      currentScore > existingScore ||
      (currentScore === existingScore && item.id.localeCompare(existing.id) < 0)
    ) {
      chosen.set(dedupeKey, item);
    }
  }

  return Array.from(chosen.values());
}

export function placeholderImage(type: "poster" | "backdrop"): string {
  const svg =
    type === "poster"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#040812"/>
              <stop offset="100%" stop-color="#12335a"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
          <text x="50%" y="46%" fill="#99d8fb" font-size="24" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">CATÁLOGO</text>
          <text x="50%" y="54%" fill="#75aacd" font-size="14" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">Sem capa</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#04070f"/>
              <stop offset="100%" stop-color="#12315a"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
          <text x="50%" y="47%" fill="#99d8fb" font-size="54" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">CATÁLOGO</text>
          <text x="50%" y="56%" fill="#75aacd" font-size="24" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">Imagem indisponível</text>
        </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const INVALID_IMG_VALUES = new Set(["N/A", "null", "undefined"]);

export function resolveHeroImageUrl(value: string | null | undefined): string {
  if (!value) return placeholderImage("backdrop");
  const trimmed = value.trim();
  if (!trimmed || INVALID_IMG_VALUES.has(trimmed)) {
    return placeholderImage("backdrop");
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

export function resolveExternalHighlightPath(
  item: Pick<HighlightItem, "id" | "badge" | "subtitle" | "externalUrl">,
): string | null {
  const raw = item.id.replace(/^tmdb-/, "");
  const byPrefix = raw.match(/^(movie|tv)-(\d+)$/);
  if (byPrefix) {
    const media = byPrefix[1];
    const numericId = byPrefix[2];
    return media === "tv" ? `/view/series/${numericId}` : `/view/movies/${numericId}`;
  }

  if (/^\d+$/.test(raw)) {
    const external = (item.externalUrl || "").toLowerCase();
    const subtitle = (item.subtitle || "").toLowerCase();
    const badge = (item.badge || "").toLowerCase();
    const isTv = external.includes("/tv/") || subtitle.includes("série") || badge.includes("série");
    return isTv ? `/view/series/${raw}` : `/view/movies/${raw}`;
  }

  return null;
}

export function resolveExternalHighlightPlayPath(
  item: Pick<HighlightItem, "id" | "badge" | "subtitle" | "externalUrl">,
): string | null {
  const raw = item.id.replace(/^tmdb-/, "");
  const byPrefix = raw.match(/^(movie|tv)-(\d+)$/);
  if (byPrefix) {
    const media = byPrefix[1];
    const numericId = byPrefix[2];
    return media === "tv"
      ? `/play/series/${numericId}?episodeId=tmdb_tv_${numericId}_s1_e1`
      : `/play/movies/${numericId}`;
  }

  if (/^\d+$/.test(raw)) {
    const external = (item.externalUrl || "").toLowerCase();
    const subtitle = (item.subtitle || "").toLowerCase();
    const badge = (item.badge || "").toLowerCase();
    const isTv = external.includes("/tv/") || subtitle.includes("série") || badge.includes("série");
    return isTv
      ? `/play/series/${raw}?episodeId=tmdb_tv_${raw}_s1_e1`
      : `/play/movies/${raw}`;
  }

  return null;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handler);
  }, [value, delayMs]);
  return debounced;
}

const PAGE_SIZE_BREAKPOINTS = [
  { max: 640, size: 12 },
  { max: 1024, size: 15 },
  { max: 1280, size: 16 },
  { max: 1536, size: 20 },
] as const;

export interface UseCatalogExplorerProps {
  highlights: HomeHighlights;
  initialTab?: CatalogType;
  initialViewMode?: ViewMode;
}

export interface UseCatalogExplorerReturn {
  router: ReturnType<typeof useRouter>;
  pathname: string | null;
  tab: CatalogType;
  viewMode: string;
  catalogSectionRef: React.RefObject<HTMLDivElement | null>;
  query: string;
  isCommandOpen: boolean;
  setIsCommandOpen: (open: boolean) => void;
  heroApi: CarouselApi | undefined;
  setHeroApi: (api: CarouselApi) => void;
  heroIndex: number;
  heroSlides: HighlightItem[];
  activeHero: HighlightItem | null;
  activeHeroSubtitle: string;
  discoverRows: HighlightRow[];
  groups: ReadonlyArray<GroupCount>;
  isLoadingList: boolean;
  isChangingPage: boolean;
  page: number;
  currentData: PaginationResult<CatalogItem> | null;
  visibleItems: CatalogListItem[];
  onTabChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onHighlightClick: (highlight: HighlightItem) => void;
  onPageChange: (next: number) => void;
  scrollToCatalog: () => void;
  resetPageAndLoading: () => void;
  filters: ReturnType<typeof useCatalogFilters>;
}

export function useCatalogExplorer({
  highlights,
  initialTab = "movies",
  initialViewMode = "discover",
}: UseCatalogExplorerProps): UseCatalogExplorerReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const catalogSectionRef = useRef<HTMLDivElement | null>(null);

  const listRequestIdRef = useRef(0);
  const [heroApi, setHeroApi] = useState<CarouselApi>();
  const tabState = useCatalogStore((s) => s.tab);
  const viewModeState = useCatalogStore((s) => s.viewMode);
  const query = useCatalogStore((s) => s.query);
  const isCommandOpen = useCatalogStore((s) => s.isCommandOpen);
  const page = useCatalogStore((s) => s.page);
  const pageSize = useCatalogStore((s) => s.pageSize);
  const groups = useCatalogStore((s) => s.groups);
  const isLoadingList = useCatalogStore((s) => s.isLoadingList);
  const isChangingPage = useCatalogStore((s) => s.isChangingPage);
  const heroIndex = useCatalogStore((s) => s.heroIndex);
  const recentWatchItems = useCatalogStore((s) => s.recentWatchItems);
  const moviesData = useCatalogStore((s) => s.moviesData);
  const seriesData = useCatalogStore((s) => s.seriesData);

  const {
    setTab,
    setIsCommandOpen,
    setGroups,
    setMoviesData,
    setSeriesData,
    setIsLoadingList,
    setIsChangingPage,
    setHeroIndex,
    setRecentWatchItems,
    setPageSize,
    resetPageAndLoading,
    changePage,
    resetGroupsAndPage,
    setQuery,
  } = useCatalogStore.getState();

  const filters = useCatalogFilters();

  const debouncedQuery = useDebouncedValue(query, 260);

  const routeTab = useMemo(() => {
    return (Object.entries(COLLECTION_ROUTE_BY_TAB) as Array<[CatalogType, string]>)
      .find(([, route]) => route === pathname)?.[0] ?? null;
  }, [pathname]);

  const tab = routeTab ?? tabState;
  const viewMode: ViewMode = routeTab
    ? "browse"
    : pathname === "/"
      ? "discover"
      : viewModeState;
  const currentData = (tab === "movies" ? moviesData : seriesData) as PaginationResult<CatalogItem> | null;

  useEffect(() => {
    const { setViewMode: storeSetViewMode } = useCatalogStore.getState();

    if (pathname === "/") {
      storeSetViewMode("discover");
      return;
    }

    const matchedTab = (Object.entries(COLLECTION_ROUTE_BY_TAB) as Array<
      [CatalogType, string]
    >).find(([, route]) => route === pathname)?.[0];

    if (matchedTab) {
      setTab(matchedTab);
      storeSetViewMode("browse");
      return;
    }

    setTab(initialTab);
    storeSetViewMode(initialViewMode);
  }, [initialTab, initialViewMode, pathname, setTab]);

  useEffect(() => {
    function updatePageSize() {
      const w = window.innerWidth;
      const nextSize = PAGE_SIZE_BREAKPOINTS.find((b) => w < b.max)?.size ?? 18;
      setPageSize(nextSize);
    }
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToCatalog = useCallback(() => {
    catalogSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const heroSlides = useMemo(() => {
    const merged = [
      highlights.hero,
      ...highlights.rows.flatMap((row) => row.items),
    ].filter((item): item is HighlightItem => Boolean(item));

    const seen = new Set<string>();
    return merged
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map((item) => ({ ...item, imageUrl: resolveHeroImageUrl(item.imageUrl) }))
      .slice(0, 12);
  }, [highlights]);

  const recentWatchRow = useMemo<HighlightRow | null>(() => {
    if (!user || recentWatchItems.length === 0) return null;
    const items: HighlightItem[] = recentWatchItems.map((item) => ({
      id: `resume-${item.contentType}-${item.contentId}${item.episodeId ? `-${item.episodeId}` : ""}`,
      title: item.title || "Título indisponível",
      subtitle: item.completed ? "Assistido recentemente" : "Continue de onde parou",
      imageUrl: item.posterUrl,
      badge: item.completed
        ? "RECENTE"
        : item.progressPct !== null
          ? `${Math.round(item.progressPct * 100)}%`
          : "RETOMAR",
      kind: "external",
      externalUrl: item.playHref,
    }));
    return {
      id: "recently-watched",
      title: "Últimos Assistidos",
      caption: "Retome rapidamente sua sessão",
      items,
    };
  }, [recentWatchItems, user]);

  const discoverRows = useMemo(
    () => (recentWatchRow ? [recentWatchRow, ...highlights.rows] : highlights.rows),
    [highlights.rows, recentWatchRow],
  );

  const visibleItems = useMemo(
    () => dedupeCatalogItems((currentData?.items || []) as CatalogListItem[], tab),
    [currentData?.items, tab],
  );

  const activeHero = heroSlides[heroIndex] || heroSlides[0] || null;
  const activeHeroSubtitle =
    activeHero?.subtitle || "Catálogo atualizado com destaque automático e curadoria contínua.";

  const onHighlightClick = useCallback(
    (highlight: HighlightItem) => {
      if (highlight.kind === "external" && !highlight.streamUrl && highlight.externalUrl) {
        const externalPath = resolveExternalHighlightPath(highlight);
        if (externalPath) router.push(externalPath);
        else router.push(highlight.externalUrl);
        return;
      }
      const realId = highlight.id.replace(/^(launch|4k|series)-/, "");
      router.push(`/view/${highlight.kind}/${realId}`);
    },
    [router],
  );

  const onTabChange = useCallback(
    (value: string) => {
      const next = value as CatalogType;
      const nextPath = COLLECTION_ROUTE_BY_TAB[next];
      const { setViewMode: storeSetViewMode } = useCatalogStore.getState();
      setTab(next);
      storeSetViewMode("browse");
      resetGroupsAndPage();
      setIsLoadingList(true);
      if (pathname !== nextPath) {
        router.push(nextPath, { scroll: false });
      }
    },
    [pathname, resetGroupsAndPage, router, setIsLoadingList, setTab],
  );

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
    },
    [setQuery],
  );

  const onPageChange = useCallback(
    (next: number) => {
      changePage(next);
    },
    [changePage],
  );

  useEffect(() => {
    if (!heroApi) return;
    const onSelect = () => setHeroIndex(heroApi.selectedScrollSnap());
    onSelect();
    heroApi.on("select", onSelect);
    heroApi.on("reInit", onSelect);
    return () => {
      heroApi.off("select", onSelect);
      heroApi.off("reInit", onSelect);
    };
  }, [heroApi, setHeroIndex]);

  useEffect(() => {
    if (!heroApi || heroSlides.length === 0) return;
    if (heroIndex >= heroSlides.length) heroApi.scrollTo(0);
  }, [heroIndex, heroSlides.length, heroApi]);

  useEffect(() => {
    if (!heroApi || heroSlides.length <= 1 || viewMode !== "discover") return;
    const timer = setInterval(() => heroApi.scrollNext(), 6500);
    return () => clearInterval(timer);
  }, [heroApi, heroSlides.length, viewMode]);

  useEffect(() => {
    if (!user) {
      setRecentWatchItems([]);
      return;
    }

    const controller = new AbortController();
    const loadRecentWatchItems = async () => {
      try {
        const payload = await authApi.listWatchProgress(18, {
          signal: controller.signal,
        });
        const items = Array.isArray(payload.items) ? payload.items : [];
        setRecentWatchItems(
          items.filter((item) => item.contentType in COLLECTION_ROUTE_BY_TAB),
        );
      } catch (error: unknown) {
        if (isRequestCanceledError(error)) return;
        console.error("[catalog-explorer] Falha ao carregar historico recente.", error);
        setRecentWatchItems([]);
      }
    };

    void loadRecentWatchItems();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    const loadGroups = async () => {
      try {
        const payload = await getCatalogGroups(tab, {
          cacheTtlMs: CACHE_TTL_MS.groups,
          signal: controller.signal,
        });
        setGroups(payload.items);
      } catch (error: unknown) {
        if (isRequestCanceledError(error)) return;
        console.error("[catalog-explorer] Falha ao carregar categorias.", error);
        setGroups([]);
      }
    };

    void loadGroups();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtersKey = [
    filters.selectedGroups.join(","),
    filters.quality,
    filters.legendado,
    filters.hasPoster,
    filters.codec,
    filters.yearFrom,
    filters.yearTo,
    filters.minEpisodes,
    filters.sort,
  ].join("|");

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestIdRef.current;

    const loadCatalog = async () => {
      try {
        const payload = await listCatalog<CatalogItem>({
          type: tab,
          query: {
            page,
            pageSize,
            q: debouncedQuery.trim(),
            sort: filters.sort,
            groups: [...filters.selectedGroups],
            quality: tab === "movies" ? filters.quality : undefined,
            legendado: filters.legendado,
            hasPoster: filters.hasPoster === "yes",
            codec: tab === "movies" ? filters.codec : undefined,
            yearFrom: tab === "movies" ? filters.yearFrom : undefined,
            yearTo: tab === "movies" ? filters.yearTo : undefined,
            minEpisodes: filters.minEpisodes,
          },
          signal: controller.signal,
          cacheTtlMs: CACHE_TTL_MS.list,
        });

        if (requestId !== listRequestIdRef.current) return;
        if (tab === "movies") setMoviesData(payload as PaginationResult<MovieItem>);
        if (tab === "series") setSeriesData(payload as PaginationResult<SeriesIndexItem>);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestId === listRequestIdRef.current) {
          console.error("[catalog-explorer] Falha ao carregar catálogo.", error);
        }
      } finally {
        if (requestId === listRequestIdRef.current) {
          setIsLoadingList(false);
          setIsChangingPage(false);
        }
      }
    };

    void loadCatalog();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, pageSize, debouncedQuery, filtersKey]);

  return {
    router,
    pathname,
    tab,
    viewMode,
    catalogSectionRef,
    query,
    isCommandOpen,
    setIsCommandOpen,
    heroApi,
    setHeroApi,
    heroIndex,
    heroSlides,
    activeHero,
    activeHeroSubtitle,
    discoverRows,
    groups,
    isLoadingList,
    isChangingPage,
    page,
    currentData,
    visibleItems,
    onTabChange,
    onQueryChange,
    onHighlightClick,
    onPageChange,
    scrollToCatalog,
    resetPageAndLoading,
    filters,
  };
}
