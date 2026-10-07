import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image (see Dockerfile) runs the self-contained server that
  // `next build` writes to .next/standalone.
  output: "standalone",
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@affix/db", "@affix/auth"],
  images: {
    // 90 is reserved for the full-bleed photography (hero, audience cards).
    qualities: [75, 90],
  },
  experimental: {
    // Dev only. Next 16.2 treats a page as restored from the browser cache when
    // its transferSize is 0, which Firefox reports while the page is still
    // loading, and reloads it in a loop. Remove once Next is upgraded (16.4
    // no longer has this check).
    reactDebugChannel: false,
  },
};

export default nextConfig;
