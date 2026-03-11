const IMAGE_PROXY_ENDPOINT = "/api/catalog/image";

function isHttpUrl(value: string): boolean {
  return /^http:\/\//i.test(value);
}

function isHttpsUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}

export function normalizeImageSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith(IMAGE_PROXY_ENDPOINT)) return trimmed;
  if (trimmed.startsWith("//")) {
    const secureUrl = `https:${trimmed}`;
    return `${IMAGE_PROXY_ENDPOINT}?url=${encodeURIComponent(secureUrl)}`;
  }
  if (trimmed.startsWith("/")) return trimmed;

  if (isHttpUrl(trimmed) || isHttpsUrl(trimmed)) {
    return `${IMAGE_PROXY_ENDPOINT}?url=${encodeURIComponent(trimmed)}`;
  }

  return null;
}
