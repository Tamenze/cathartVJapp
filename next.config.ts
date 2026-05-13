import { withSentryConfig } from "@sentry/nextjs";
import { withAxiom } from "next-axiom";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger audio uploads (up to 25MB — Groq Whisper limit)
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};


export default withSentryConfig(withAxiom(nextConfig), {
  org: "na-h55",
  project: "cathart-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
