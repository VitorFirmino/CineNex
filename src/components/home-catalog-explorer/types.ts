import type { HighlightRow, HomeHighlights } from "@shared/types/highlights-types";

export interface HomeCatalogExplorerProps {
  highlights: HomeHighlights;
}

export interface HomeHighlightRowProps {
  row: HighlightRow;
  rowIndex: number;
}

export interface HomeDeferredHighlightRowProps {
  row: HighlightRow;
  rowIndex: number;
}
