import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);import bannerUrl from 'url';const __dirname = bannerUrl.fileURLToPath(new URL('.', import.meta.url));

// open-next.config.ts
var config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "direct"
    }
  },
  // Force the esbuild bundler to use the "workerd" export condition.
  // This makes Prisma 7 resolve to its `edge.js` entry (WASM-only, no Rust
  // engine, no fs.readdir) instead of `index.js` (which requires the 4.5 MiB
  // query_compiler_fast_bg.wasm-base64.js file). Critical for staying under
  // the 3 MiB compressed Worker size limit on the free plan.
  cloudflare: {
    useWorkerdCondition: true
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
      queue: "direct"
    }
  }
};
var open_next_config_default = config;
export {
  open_next_config_default as default
};
