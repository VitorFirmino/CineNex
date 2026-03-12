import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useCatalogStore } from "@store/catalog-store";
import { useCatalogFilters } from "./use-catalog-filters";

const DEFAULT_STATE = useCatalogStore.getState();

describe("use-catalog-filters", () => {
  beforeEach(() => {
    useCatalogStore.setState(DEFAULT_STATE, true);
  });

  afterEach(() => {
    useCatalogStore.setState(DEFAULT_STATE, true);
  });

  it("should expose the current filter snapshot and derived counters", () => {
    useCatalogStore.setState({
      tab: "movies",
      selectedGroups: ["Aventura", "Drama"],
      legendado: "yes",
      hasPoster: "yes",
      codec: "H265",
      yearFrom: "2020",
      yearTo: "2024",
      sort: "year_desc",
      isAdvancedOpen: true,
    });

    const { result } = renderHook(() => useCatalogFilters());

    expect(result.current.selectedGroups).toEqual(["Aventura", "Drama"]);
    expect(result.current.activeAdvancedCount).toBe(7);
    expect(result.current.isAdvancedOpen).toBe(true);
    expect(result.current.sortOptions.map((option) => option.value)).toContain("year_desc");
  });

  it("should mutate the store through the returned actions", () => {
    const { result } = renderHook(() => useCatalogFilters());

    result.current.onToggleGroupFilter("Aventura");
    result.current.onQualityChange("FHD");
    result.current.setLegendado("yes");
    result.current.setHasPoster("yes");
    result.current.setCodec("H265");
    result.current.setYearFrom("2020");
    result.current.setYearTo("2024");
    result.current.setMinEpisodes("8");
    result.current.onSortChange("title_asc");
    result.current.setIsAdvancedOpen(true);

    expect(useCatalogStore.getState()).toMatchObject({
      selectedGroups: ["Aventura"],
      quality: "FHD",
      legendado: "yes",
      hasPoster: "yes",
      codec: "H265",
      yearFrom: "2020",
      yearTo: "2024",
      minEpisodes: "8",
      sort: "title_asc",
      isAdvancedOpen: true,
    });
  });
});
