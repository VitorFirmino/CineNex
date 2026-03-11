function normalizeBaseUrl(rawValue: string | null | undefined): string | null {
  const candidate = String(rawValue || "").trim();
  if (!candidate) return null;

  const withScheme = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch (error) {
    console.error("[auth-redirect] Falha ao normalizar base URL.", error);
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (normalized === "localhost" || normalized === "::1") return true;
  if (normalized === "127.0.0.1") return true;
  return false;
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return isLoopbackHostname(parsed.hostname);
  } catch (error) {
    console.error("[auth-redirect] Falha ao validar origin de loopback.", error);
    return false;
  }
}

function getConfiguredOrigins(): string[] {
  const envCandidates = [process.env.AUTH_REDIRECT_BASE_URL];

  const normalized = envCandidates
    .map((candidate) => normalizeBaseUrl(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set(normalized));
}

function readForwardedOrigin(request: Request): string | null {
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!forwardedHost) return null;

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : forwardedHost.startsWith("localhost") ||
          forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https";

  return normalizeBaseUrl(`${protocol}://${forwardedHost}`);
}

export function resolveAuthOrigin(request: Request): string {
  const configuredOrigins = getConfiguredOrigins();
  const configuredSet = new Set(configuredOrigins);

  const forwarded = readForwardedOrigin(request);
  if (forwarded && configuredSet.has(forwarded)) return forwarded;

  const requestOrigin = normalizeBaseUrl(new URL(request.url).origin);
  if (requestOrigin && configuredSet.has(requestOrigin)) return requestOrigin;

  if (forwarded && isLoopbackOrigin(forwarded)) return forwarded;
  if (requestOrigin && isLoopbackOrigin(requestOrigin)) return requestOrigin;

  if (configuredOrigins.length > 0) {
    return configuredOrigins[0];
  }

  if (process.env.NODE_ENV !== "production") {
    if (forwarded) return forwarded;
    if (requestOrigin) return requestOrigin;
  }

  throw new Error(
    "Auth redirect origin is not configured. Set AUTH_REDIRECT_BASE_URL.",
  );
}

export function buildAuthCallbackUrl(request: Request, nextPath?: string): string {
  const callbackUrl = new URL("/auth/callback", resolveAuthOrigin(request));

  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    callbackUrl.searchParams.set("next", nextPath);
  }

  return callbackUrl.toString();
}
