import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents: true,
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
    root: process.cwd(),
    resolveAlias: {
      "@store": "./src/store",
    },
  },
};

export default nextConfig;
