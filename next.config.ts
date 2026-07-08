import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser binaries out of the webpack bundle; they're resolved from
  // node_modules at runtime (traced by Vercel's file tracing).
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium", "playwright"],
};

export default nextConfig;
