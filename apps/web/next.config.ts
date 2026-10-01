import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@affix/db", "@affix/auth"],
  images: {
    // 90 is reserved for the full-bleed photography (hero, audience cards).
    qualities: [75, 90],
  },
};

export default nextConfig;
