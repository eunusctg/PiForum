import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Enables `getCloudflareContext()` to work in local `next dev` mode by
// spawning a wrangler-backed platform proxy that mirrors the bindings in
// wrangler.toml (D1, R2, KV). No-op in production (the OpenNext worker
// entrypoint sets up the context itself).
try {
  initOpenNextCloudflareForDev();
} catch (err) {
  console.warn("[next.config] initOpenNextCloudflareForDev failed:", err);
}

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
