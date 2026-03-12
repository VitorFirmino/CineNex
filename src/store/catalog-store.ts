'use client';

import { create } from 'zustand';
import type {
  CatalogType,
  GroupCount,
  MovieItem,
  PaginationResult,
  SeriesIndexItem,
} from '@shared/types/catalog-types';
import type { RecentWatchItem } from '@components/catalog-explorer/hooks/use-catalog-explorer';

export type LegendadoFilter = 'all' | 'yes' | 'no';
export type QualityFilter = 'all' | '4K' | 'FHD' | 'HD' | 'SD';
export type PosterFilter = 'all' | 'yes';
export type CodecFilter = 'all' | 'H265';
export type ViewMode = 'discover' | 'browse';
export type SortValue = 'default' | 'title_asc' | 'title_desc' | 'year_desc' | 'year_asc' | 'episodes_desc' | 'episodes_asc';

export const MAX_GROUP_FILTERS = 5 as const;

export const MOVIES_SORT_OPTIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'title_asc', label: 'Título (A-Z)' },
  { value: 'title_desc', label: 'Título (Z-A)' },
  { value: 'year_desc', label: 'Ano (mais novo)' },
  { value: 'year_asc', label: 'Ano (mais antigo)' },
] as const satisfies ReadonlyArray<{ value: SortValue; label: string }>;

export const SERIES_SORT_OPTIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'title_asc', label: 'Título (A-Z)' },
  { value: 'title_desc', label: 'Título (Z-A)' },
  { value: 'episodes_desc', label: 'Mais episódios' },
  { value: 'episodes_asc', label: 'Menos episódios' },
] as const satisfies ReadonlyArray<{ value: SortValue; label: string }>;

export type SortOptions = typeof MOVIES_SORT_OPTIONS | typeof SERIES_SORT_OPTIONS;

export interface CatalogFiltersState {
  readonly selectedGroups: ReadonlyArray<string>;
  readonly quality: QualityFilter;
  readonly legendado: LegendadoFilter;
  readonly hasPoster: PosterFilter;
  readonly codec: CodecFilter;
  readonly yearFrom: string;
  readonly yearTo: string;
  readonly minEpisodes: string;
  readonly sort: SortValue;
  readonly isAdvancedOpen: boolean;
}

export interface CatalogFiltersActions {
  setIsAdvancedOpen: (open: boolean) => void;
  resetGroupsAndPage: () => void;
  onSelectSingleGroup: (value: string) => void;
  onToggleGroupFilter: (value: string) => void;
  onQualityChange: (value: QualityFilter) => void;
  onSortChange: (value: SortValue) => void;
  setLegendado: (value: LegendadoFilter) => void;
  setHasPoster: (value: PosterFilter) => void;
  setCodec: (value: CodecFilter) => void;
  setYearFrom: (value: string) => void;
  setYearTo: (value: string) => void;
  setMinEpisodes: (value: string) => void;
  resetAdvancedFilters: () => void;
}

export interface CatalogExplorerState {
  readonly tab: CatalogType;
  readonly viewMode: ViewMode;
  readonly query: string;
  readonly isCommandOpen: boolean;
  readonly page: number;
  readonly pageSize: number;
  readonly groups: ReadonlyArray<GroupCount>;
  readonly isLoadingList: boolean;
  readonly isChangingPage: boolean;
  readonly moviesData: PaginationResult<MovieItem> | null;
  readonly seriesData: PaginationResult<SeriesIndexItem> | null;
  readonly heroIndex: number;
  readonly recentWatchItems: ReadonlyArray<RecentWatchItem>;
}

export interface CatalogExplorerActions {
  setTab: (tab: CatalogType) => void;
  setViewMode: (mode: ViewMode) => void;
  setQuery: (q: string) => void;
  setIsCommandOpen: (open: boolean) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setGroups: (groups: GroupCount[]) => void;
  setIsLoadingList: (loading: boolean) => void;
  setIsChangingPage: (changing: boolean) => void;
  setMoviesData: (data: PaginationResult<MovieItem>) => void;
  setSeriesData: (data: PaginationResult<SeriesIndexItem>) => void;
  setHeroIndex: (index: number) => void;
  setRecentWatchItems: (items: RecentWatchItem[]) => void;
  resetPageAndLoading: () => void;
  changePage: (next: number) => void;
}

export type CatalogStore = CatalogFiltersState & CatalogFiltersActions & CatalogExplorerState & CatalogExplorerActions;

const DEFAULT_FILTERS: CatalogFiltersState = {
  selectedGroups: [],
  quality: 'all',
  legendado: 'all',
  hasPoster: 'all',
  codec: 'all',
  yearFrom: '',
  yearTo: '',
  minEpisodes: '',
  sort: 'default',
  isAdvancedOpen: false,
};

export const useCatalogStore = create<CatalogStore>()((set, get) => ({
  ...DEFAULT_FILTERS,
  tab: 'movies',
  viewMode: 'discover',
  query: '',
  isCommandOpen: false,
  page: 1,
  pageSize: 15,
  groups: [],
  isLoadingList: true,
  isChangingPage: false,
  moviesData: null,
  seriesData: null,
  heroIndex: 0,
  recentWatchItems: [],

  setIsAdvancedOpen: (open) => set({ isAdvancedOpen: open }),

  resetGroupsAndPage: () =>
    set({ selectedGroups: [], page: 1, isLoadingList: true }),

  onSelectSingleGroup: (value) => {
    const groups = value && value !== 'all' ? [value] : [];
    set({ selectedGroups: groups, page: 1, isLoadingList: true });
  },

  onToggleGroupFilter: (value) => {
    const normalized = value.trim();
    const { selectedGroups } = get();

    if (!normalized || normalized === 'all') {
      if (selectedGroups.length === 0) return;
      set({ selectedGroups: [], page: 1, isLoadingList: true });
      return;
    }

    const exists = selectedGroups.includes(normalized);
    if (exists) {
      set({
        selectedGroups: selectedGroups.filter((g) => g !== normalized),
        page: 1,
        isLoadingList: true,
      });
      return;
    }

    if (selectedGroups.length >= MAX_GROUP_FILTERS) return;
    set({
      selectedGroups: [...selectedGroups, normalized],
      page: 1,
      isLoadingList: true,
    });
  },

  onQualityChange: (value) => set({ quality: value, page: 1, isLoadingList: true }),

  onSortChange: (value) => set({ sort: value, page: 1, isLoadingList: true }),

  setLegendado: (value) => set({ legendado: value, page: 1, isLoadingList: true }),

  setHasPoster: (value) => set({ hasPoster: value, page: 1, isLoadingList: true }),

  setCodec: (value) => set({ codec: value, page: 1, isLoadingList: true }),

  setYearFrom: (value) => set({ yearFrom: value }),

  setYearTo: (value) => set({ yearTo: value }),

  setMinEpisodes: (value) => set({ minEpisodes: value }),

  resetAdvancedFilters: () =>
    set({ ...DEFAULT_FILTERS, isAdvancedOpen: get().isAdvancedOpen, page: 1, isLoadingList: true }),

  setTab: (tab) => set({ tab }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setQuery: (q) => set({ query: q, page: 1, isLoadingList: true, viewMode: 'browse' }),

  setIsCommandOpen: (open) => set({ isCommandOpen: open }),

  setPage: (page) => set({ page }),

  setPageSize: (size) => set({ pageSize: size }),

  setGroups: (groups) => set({ groups }),

  setIsLoadingList: (loading) => set({ isLoadingList: loading }),

  setIsChangingPage: (changing) => set({ isChangingPage: changing }),

  setMoviesData: (data) => set({ moviesData: data }),

  setSeriesData: (data) => set({ seriesData: data }),

  setHeroIndex: (index) => set({ heroIndex: index }),

  setRecentWatchItems: (items) => set({ recentWatchItems: items }),

  resetPageAndLoading: () => set({ page: 1, isLoadingList: true }),

  changePage: (next) => {
    if (get().isChangingPage) return;
    set({ isChangingPage: true, page: next, isLoadingList: true });
  },
}));

export const selectFilters = (s: CatalogStore): CatalogFiltersState => ({
  selectedGroups: s.selectedGroups,
  quality: s.quality,
  legendado: s.legendado,
  hasPoster: s.hasPoster,
  codec: s.codec,
  yearFrom: s.yearFrom,
  yearTo: s.yearTo,
  minEpisodes: s.minEpisodes,
  sort: s.sort,
  isAdvancedOpen: s.isAdvancedOpen,
});

export const selectActiveAdvancedCount = (s: CatalogStore): number => {
  let count = 0;
  count += s.selectedGroups.length;
  if (s.hasPoster !== 'all') count += 1;
  if (s.sort !== 'default') count += 1;
  if (s.tab !== 'series' && s.codec !== 'all') count += 1;
  if (s.tab !== 'series' && s.yearFrom.trim()) count += 1;
  if (s.tab !== 'series' && s.yearTo.trim()) count += 1;
  if (s.tab === 'series' && s.minEpisodes.trim()) count += 1;
  return count;
};

export const selectSortOptions = (s: CatalogStore): SortOptions =>
  s.tab === 'series' ? SERIES_SORT_OPTIONS : MOVIES_SORT_OPTIONS;

export const selectCurrentData = (
  s: CatalogStore,
): PaginationResult<MovieItem> | PaginationResult<SeriesIndexItem> | null =>
  s.tab === 'movies' ? s.moviesData : s.seriesData;
