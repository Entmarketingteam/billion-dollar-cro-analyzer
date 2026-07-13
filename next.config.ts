import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser binaries out of the webpack bundle; they're resolved from
  // node_modules at runtime (traced by Vercel's file tracing).
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium", "playwright"],
  // The tracer misses playwright-core's data files (browsers.json) and
  // sparticuz's compressed chromium binaries — include them explicitly.
  outputFileTracingIncludes: {
    "/api/analyze-async": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;
