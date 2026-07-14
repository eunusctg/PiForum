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
  // Keep heavy Node-only packages out of the Cloudflare Worker bundle.
  // These are only used in local dev (Node.js) and never on the Workers
  // runtime. Listing them here prevents Next/OpenNext from bundling them,
  // which keeps the worker's compressed size under the 3 MiB free-plan limit.
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/core",
    "@libsql/client",
    "libsql",
    // next-auth is NOT used (custom auth system) — exclude from server bundle
    "next-auth",
    // Node-only / unused packages — never needed server-side on Workers
    "sharp",
    "better-sqlite3",
    "react-syntax-highlighter",
    "@mdxeditor/editor",
    "qrcode",
  ],
};

export default nextConfig;
