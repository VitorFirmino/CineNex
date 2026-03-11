import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // cacheComponents: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  cacheLife: {
    highlights: { stale: 120, revalidate: 300, expire: 3600 },
    summary: { stale: 60, revalidate: 120, expire: 900 },
    groups: { stale: 120, revalidate: 300, expire: 1800 },
    movies: { stale: 60, revalidate: 120, expire: 900 },
    series: { stale: 60, revalidate: 120, expire: 900 },
    seriesDetails: { stale: 120, revalidate: 300, expire: 1800 },
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
