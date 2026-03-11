const LEGACY_CATALOG_ID_PREFIX = /^(launch|4k|series)-/i;

export function normalizeCatalogContentId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(LEGACY_CATALOG_ID_PREFIX, "");
}
