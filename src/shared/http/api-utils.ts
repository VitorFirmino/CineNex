export function parseIntParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt(value || "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function getStringParam(value: string | null): string | undefined {
  const normalized = (value || "").trim();
  return normalized ? normalized : undefined;
}

export function parseOptionalIntParam(
  value: string | null,
  min: number,
  max: number,
): number | undefined {
  const n = Number.parseInt(value || "", 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, min), max);
}

const TRUTHY_PARAMS = new Set(["1", "true", "yes"]);
const FALSY_PARAMS = new Set(["0", "false", "no"]);

export function parseBooleanParam(value: string | null): boolean | undefined {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (TRUTHY_PARAMS.has(normalized)) return true;
  if (FALSY_PARAMS.has(normalized)) return false;
  return undefined;
}

export function parseCsvParam(value: string | null, maxItems = 5): string[] {
  if (!value) return [];
  const unique = new Set<string>();
  for (const part of value.split(",")) {
    const normalized = part.trim();
    if (!normalized || normalized.toLowerCase() === "all") continue;
    unique.add(normalized);
    if (unique.size >= maxItems) break;
  }
  return Array.from(unique);
}
