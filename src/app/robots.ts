import type { MetadataRoute } from "next";

const DEFAULT_SITE_ORIGIN = "http://localhost:3000";

function resolveSiteOrigin(): string {
  const candidate =
    process.env.AUTH_REDIRECT_BASE_URL?.trim() ||
    process.env.PAGE_URL?.trim() ||
    DEFAULT_SITE_ORIGIN;

  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch (error) {
    console.error("[robots] Falha ao normalizar origem base.", error);
    return DEFAULT_SITE_ORIGIN;
  }
}

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = resolveSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/collection",
        "/collection/movies",
        "/collection/series",
        "/login",
        "/register",
        "/forgot-password",
        "/cookies",
        "/privacy",
        "/terms",
        "/view/",
      ],
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/play/",
        "/collection/favorites",
        "/reset-password",
        "/verify-otp",
      ],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
