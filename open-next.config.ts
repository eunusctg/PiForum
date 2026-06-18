// OpenNext for Cloudflare — adapter config
// Docs: https://opennext.js.org/cloudflare
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "direct",
    },
  },
  // Force the esbuild bundler to use the "workerd" export condition.
  // This makes Prisma 7 resolve to its `edge.js` entry (WASM-only, no Rust
  // engine, no fs.readdir) instead of `index.js` (which requires the 4.5 MiB
  // query_compiler_fast_bg.wasm-base64.js file). Critical for staying under
  // the 3 MiB compressed Worker size limit on the free plan.
  cloudflare: {
    useWorkerdCondition: true,
  },
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "direct",
    },
  },
};

export default config;