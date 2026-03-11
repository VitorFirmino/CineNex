"use client";

import {
  useCatalogStore,
  selectActiveAdvancedCount,
  selectSortOptions,
  MOVIES_SORT_OPTIONS,
  SERIES_SORT_OPTIONS,
  MAX_GROUP_FILTERS,
  type CatalogFiltersState,
  type QualityFilter,
  type LegendadoFilter,
  type PosterFilter,
  type CodecFilter,
  type SortValue,
  type SortOptions,
} from '@store/catalog-store';

export type { LegendadoFilter, QualityFilter, PosterFilter, CodecFilter, SortValue, SortOptions };
export { MOVIES_SORT_OPTIONS, SERIES_SORT_OPTIONS, MAX_GROUP_FILTERS };

export interface UseCatalogFiltersReturn extends CatalogFiltersState {
  readonly sortOptions: SortOptions;
  readonly activeAdvancedCount: number;
  setIsAdvancedOpen: (open: boolean) => void;
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
  resetGroupsAndPage: () => void;
}

export function useCatalogFilters(): UseCatalogFiltersReturn {
  const selectedGroups = useCatalogStore((s) => s.selectedGroups);
  const quality = useCatalogStore((s) => s.quality);
  const legendado = useCatalogStore((s) => s.legendado);
  const hasPoster = useCatalogStore((s) => s.hasPoster);
  const codec = useCatalogStore((s) => s.codec);
  const yearFrom = useCatalogStore((s) => s.yearFrom);
  const yearTo = useCatalogStore((s) => s.yearTo);
  const minEpisodes = useCatalogStore((s) => s.minEpisodes);
  const sort = useCatalogStore((s) => s.sort);
  const isAdvancedOpen = useCatalogStore((s) => s.isAdvancedOpen);
  const activeAdvancedCount = useCatalogStore(selectActiveAdvancedCount);
  const sortOptions = useCatalogStore(selectSortOptions);

  const {
    setIsAdvancedOpen,
    onSelectSingleGroup,
    onToggleGroupFilter,
    onQualityChange,
    onSortChange,
    setLegendado,
    setHasPoster,
    setCodec,
    setYearFrom,
    setYearTo,
    setMinEpisodes,
    resetAdvancedFilters,
    resetGroupsAndPage,
  } = useCatalogStore.getState();

  return {
    selectedGroups,
    quality,
    legendado,
    hasPoster,
    codec,
    yearFrom,
    yearTo,
    minEpisodes,
    sort,
    isAdvancedOpen,
    sortOptions,
    activeAdvancedCount,
    setIsAdvancedOpen,
    onSelectSingleGroup,
    onToggleGroupFilter,
    onQualityChange,
    onSortChange,
    setLegendado,
    setHasPoster,
    setCodec,
    setYearFrom,
    setYearTo,
    setMinEpisodes,
    resetAdvancedFilters,
    resetGroupsAndPage,
  };
}
