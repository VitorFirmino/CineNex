import { NextRequest, NextResponse } from "next/server";

const FETCH_TIMEOUT_MS = 8000;
const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#060912"/>
        <stop offset="100%" stop-color="#0f1f35"/>
      </linearGradient>
    </defs>
    <rect fill="url(#g)" width="100%" height="100%" />
    <text x="50%" y="46%" text-anchor="middle" fill="#9bdcf6" font-size="48" font-family="Arial, sans-serif">CATÁLOGO</text>
    <text x="50%" y="54%" text-anchor="middle" fill="#78a7d0" font-size="24" font-family="Arial, sans-serif">Imagem indisponível</text>
  </svg>`,
)}`;

function isPrivateIpHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "::1") return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d+)\./);
  if (match) {
    const octet = Number.parseInt(match[1] || "", 10);
    if (!Number.isNaN(octet) && octet >= 16 && octet <= 31) return true;
  }
  return false;
}

function validateTarget(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (isPrivateIpHost(parsed.hostname)) return null;
    return parsed;
  } catch (error) {
    console.error("[catalog/image] URL de imagem invalida.", error);
    return null;
  }
}

function fallbackResponse(): NextResponse {
  const encoded = FALLBACK_IMAGE.split(",")[1] || "";
  const body = decodeURIComponent(encoded);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const target = validateTarget(params.get("url"));

  if (!target) {
    return fallbackResponse();
  }

  try {
    const response = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Media-Catalog/1.0",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 12 },
    });

    if (!response.ok) return fallbackResponse();

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return fallbackResponse();

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=43200, s-maxage=43200, stale-while-revalidate=604800",
        Vary: "Accept",
      },
    });
  } catch (error) {
    console.error("[catalog/image] Falha ao buscar imagem remota.", error);
    return fallbackResponse();
  }
}
