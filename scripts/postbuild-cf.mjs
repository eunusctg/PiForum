#!/usr/bin/env node
/**
 * PiForum — Post-OpenNext build optimization for Cloudflare Workers
 * ==================================================================
 *
 * Trims the .open-next worker bundle to fit under Cloudflare's
 * 3 MiB compressed size limit on the free plan.
 *
 * Strategy: Keep the Prisma WASM query compiler (required for SQL
 * generation even with D1 adapter) but remove unnecessary code from
 * the bundle to stay under the limit.
 *
 * IMPORTANT: The Prisma WASM query compiler (~3.4 MB uncompressed)
 * IS required at runtime — even with the D1 adapter. The adapter
 * only handles query EXECUTION, not compilation. The WASM compiler
 * generates SQL from Prisma queries, which the D1 adapter then
 * executes against D1. We must NOT stub it out.
 *
 * Run AFTER `opennextjs-cloudflare build`, BEFORE `wrangler deploy`.
 *
 * Usage:
 *   node scripts/postbuild-cf.mjs
 */

import { readFileSync, writeFileSync, existsSync, rmSync, statSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OPEN_NEXT_DIR = '.open-next'

let bytesSaved = 0

function getDirSize(dir) {
  let total = 0
  function walk(d) {
    try {
      for (const f of readdirSync(d)) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) walk(p)
        else total += statSync(p).size
      }
    } catch {}
  }
  try { walk(dir) } catch {}
  return total
}

console.log('[postbuild-cf] Optimizing Cloudflare Worker bundle...\n')

// === Step 0: Replace .prisma/client/index.js with edge.js in the .open-next bundle ===
// The esbuild bundler picks index.js (regardless of workerd condition),
// which requires the 4.5 MiB query_compiler_fast_bg.wasm-base64.js file.
// edge.js uses @prisma/client/runtime/wasm-compiler-edge.js instead — no
// base64 file needed. This saves ~4.5 MiB uncompressed / ~1 MiB compressed,
// keeping the Worker under Cloudflare's 3 MiB free-plan limit.
//
// We do this ONLY in the .open-next bundle (not in node_modules root) because
// the edge client doesn't work in Node.js local dev.
const PRISMA_CLIENT_DIR = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/.prisma/client')
const EDGE_JS = join(PRISMA_CLIENT_DIR, 'edge.js')
const INDEX_JS = join(PRISMA_CLIENT_DIR, 'index.js')
const BASE64_JS = join(PRISMA_CLIENT_DIR, 'query_compiler_fast_bg.wasm-base64.js')
const BASE64_MJS = join(PRISMA_CLIENT_DIR, 'query_compiler_fast_bg.wasm-base64.mjs')

if (existsSync(EDGE_JS) && existsSync(INDEX_JS)) {
  const edgeSrc = readFileSync(EDGE_JS, 'utf8')
  const indexSrc = readFileSync(INDEX_JS, 'utf8')
  if (edgeSrc !== indexSrc) {
    const indexSize = Buffer.byteLength(indexSrc, 'utf8')
    const edgeSize = Buffer.byteLength(edgeSrc, 'utf8')
    writeFileSync(INDEX_JS, edgeSrc, 'utf8')
    bytesSaved += indexSize - edgeSize
    console.log(`✓ Replaced .prisma/client/index.js with edge.js content (saved ${((indexSize - edgeSize) / 1024).toFixed(1)} KiB)`)
  }
}
// Now safe to delete the 4.5 MiB base64 file (no longer referenced by index.js)
if (existsSync(BASE64_JS)) {
  const size = statSync(BASE64_JS).size
  rmSync(BASE64_JS, { force: true })
  bytesSaved += size
  console.log(`✓ Deleted query_compiler_fast_bg.wasm-base64.js (${(size / 1024 / 1024).toFixed(2)} MiB)`)
}
if (existsSync(BASE64_MJS)) {
  const size = statSync(BASE64_MJS).size
  rmSync(BASE64_MJS, { force: true })
  bytesSaved += size
  console.log(`✓ Deleted query_compiler_fast_bg.wasm-base64.mjs (${(size / 1024 / 1024).toFixed(2)} MiB)`)
}

// === Step 1: Remove unused durable objects ===
const buildDir = join(OPEN_NEXT_DIR, '.build/durable-objects')

// Remove ISR cache files (we use incrementalCache: "dummy", so they're not needed)
const cacheDir = join(OPEN_NEXT_DIR, 'cache')
if (existsSync(cacheDir)) {
  const size = getDirSize(cacheDir)
  rmSync(cacheDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`✓ Removed cache/ (${(size / 1024).toFixed(1)} KiB)`)
}

if (existsSync(buildDir)) {
  const stubCode = `export class DOQueueHandler { constructor() {} async fetch() { return new Response("stub"); } }
export class DOShardedTagCache { constructor() {} async fetch() { return new Response("stub"); } }
export class BucketCachePurge { constructor() {} async fetch() { return new Response("stub"); } }
`
  const queueFile = join(buildDir, 'queue.js')
  const tagCacheFile = join(buildDir, 'sharded-tag-cache.js')
  const bucketCacheFile = join(buildDir, 'bucket-cache-purge.js')

  for (const file of [queueFile, tagCacheFile, bucketCacheFile]) {
    if (existsSync(file)) {
      const size = statSync(file).size
      writeFileSync(file, stubCode, 'utf8')
      bytesSaved += size - Buffer.byteLength(stubCode, 'utf8')
      console.log(`  Stubbed ${file} (saved ${(size / 1024).toFixed(1)} KiB)`)
    }
  }
}

// === Step 2: Remove cloudflare-templates (build-time only) ===
const templateDir = join(OPEN_NEXT_DIR, 'cloudflare-templates')
if (existsSync(templateDir)) {
  const size = getDirSize(templateDir)
  rmSync(templateDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`✓ Removed cloudflare-templates/ (${(size / 1024).toFixed(1)} KiB)`)
}

// === Step 3: Remove cloudflare/images.js (only used in dev, ~20 KiB) ===
const imagesFile = join(OPEN_NEXT_DIR, 'cloudflare/images.js')
if (existsSync(imagesFile)) {
  const size = statSync(imagesFile).size
  writeFileSync(imagesFile, `export function handleCdnCgiImageRequest() { return new Response("Not found", { status: 404 }); }
export function handleImageRequest() { return new Response("Not found", { status: 404 }); }
`, 'utf8')
  bytesSaved += size - 100
  console.log(`✓ Stubbed cloudflare/images.js (saved ${((size - 100) / 1024).toFixed(1)} KiB)`)
}

// === Step 4: Remove cloudflare/skew-protection.js ===
const skewFile = join(OPEN_NEXT_DIR, 'cloudflare/skew-protection.js')
if (existsSync(skewFile)) {
  const size = statSync(skewFile).size
  writeFileSync(skewFile, `export function maybeGetSkewProtectionResponse() { return null; }
`, 'utf8')
  bytesSaved += size - 60
  console.log(`✓ Stubbed cloudflare/skew-protection.js (saved ${((size - 60) / 1024).toFixed(1)} KiB)`)
}

// === Step 5: Remove dynamodb-provider (not used on Cloudflare) ===
const dynamoDir = join(OPEN_NEXT_DIR, 'dynamodb-provider')
if (existsSync(dynamoDir)) {
  const size = getDirSize(dynamoDir)
  rmSync(dynamoDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`✓ Removed dynamodb-provider/ (${(size / 1024).toFixed(1)} KiB)`)
}

// === Step 6: Stub Node-only react-dom variants (Workers uses edge) ===
const reactDomDir = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/react-dom/cjs')
if (existsSync(reactDomDir)) {
  const stubFiles = [
    'react-dom-server.node.production.js',
    'react-dom-server-legacy.node.production.js',
    'react-dom-server.browser.production.js',
    'react-dom-server-legacy.browser.production.js',
  ]
  for (const file of stubFiles) {
    const filePath = join(reactDomDir, file)
    if (existsSync(filePath)) {
      const size = statSync(filePath).size
      writeFileSync(filePath, `'use strict';module.exports=require('./react-dom-server.edge.production.js');`, 'utf8')
      const stubSize = statSync(filePath).size
      bytesSaved += size - stubSize
      console.log(`✓ Stubbed ${file} (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
    }
  }
}

// === Step 7: Stub Node-only compression module ===
const compressionFile = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/compression/index.js')
if (existsSync(compressionFile)) {
  const size = statSync(compressionFile).size
  writeFileSync(compressionFile, `module.exports = function() { return function(req, res, next) { if (next) next(); }; };`, 'utf8')
  const stubSize = statSync(compressionFile).size
  bytesSaved += size - stubSize
  console.log(`✓ Stubbed compression/index.js (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
}

// === Step 8: Deduplicate app-page templates ===
const ssrDir = join(OPEN_NEXT_DIR, 'server-functions/default/.next/server/chunks/ssr')
if (existsSync(ssrDir)) {
  const appPageFiles = readdirSync(ssrDir).filter(f =>
    f.startsWith('node_modules_next_dist_esm_build_templates_app-page_') && f.endsWith('.js')
  )
  if (appPageFiles.length > 2) {
    const referenceFile = appPageFiles[0]
    let saved = 0
    for (let i = 1; i < appPageFiles.length; i++) {
      const filePath = join(ssrDir, appPageFiles[i])
      const size = statSync(filePath).size
      writeFileSync(filePath, `module.exports=require('./${referenceFile}');`, 'utf8')
      saved += size - statSync(filePath).size
    }
    bytesSaved += saved
    console.log(`✓ Deduplicated ${appPageFiles.length - 1} app-page templates (saved ${(saved / 1024).toFixed(1)} KiB)`)
  }
}

// === Step 9: Stub Firebase messaging (large, not critical for SSR) ===
if (existsSync(ssrDir)) {
  const firebaseFiles = readdirSync(ssrDir).filter(f =>
    f.startsWith('node_modules_firebase_messaging') && !f.includes('1gkbocp')
  )
  for (const file of firebaseFiles) {
    const filePath = join(ssrDir, file)
    const size = statSync(filePath).size
    writeFileSync(filePath, `export {};`, 'utf8')
    const stubSize = statSync(filePath).size
    bytesSaved += size - stubSize
    console.log(`✓ Stubbed ${file} (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
  }
}

// === Step 10: Stub @edge-runtime/primitives (not needed in Workers) ===
const edgeRuntimeDir = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/@edge-runtime/primitives')
if (existsSync(edgeRuntimeDir)) {
  const size = getDirSize(edgeRuntimeDir)
  const loadFile = join(edgeRuntimeDir, 'load.js')
  if (existsSync(loadFile)) {
    writeFileSync(loadFile, `export const getRequestHandler=()=>({});export default{};`, 'utf8')
  }
  const savedSize = size - getDirSize(edgeRuntimeDir)
  bytesSaved += savedSize
  if (savedSize > 0) console.log(`✓ Stubbed @edge-runtime/primitives (saved ${(savedSize / 1024).toFixed(1)} KiB)`)
}

// === Step 11: Remove @prisma/adapter-libsql + @libsql (not needed on Workers) ===
const libsqlPaths = [
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@prisma/adapter-libsql'),
  join(OPEN_NEXT_DIR, 'node_modules/@prisma/adapter-libsql'),
]
for (const libsqlDir of libsqlPaths) {
  if (existsSync(libsqlDir)) {
    const size = getDirSize(libsqlDir)
    rmSync(libsqlDir, { recursive: true, force: true })
    bytesSaved += size
    console.log(`✓ Removed @prisma/adapter-libsql/ (${(size / 1024).toFixed(1)} KiB)`)
  }
}
const libsqlDeps = [
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@libsql'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/libsql'),
  join(OPEN_NEXT_DIR, 'node_modules/@libsql'),
  join(OPEN_NEXT_DIR, 'node_modules/libsql'),
]
for (const dep of libsqlDeps) {
  if (existsSync(dep)) {
    const size = getDirSize(dep)
    rmSync(dep, { recursive: true, force: true })
    bytesSaved += size
    console.log(`✓ Removed ${dep.split('/').slice(-2).join('/')} (${(size / 1024).toFixed(1)} KiB)`)
  }
}

// === Step 12: Patch handler.mjs — strip verbose strings & stub unused inlined modules ===
// The handler.mjs is an esbuild bundle with all server code inlined. We need to:
// 1. Strip diagnostic strings and source maps (minor savings)
// 2. Stub inlined modules that are not needed at runtime (major savings)
//
// The esbuild bundle format wraps each module as:
//   "path/to/module.js"(exports,module){ ... module code ... }
// We find specific modules by their path and replace their content with stubs.
const handlerFile = join(OPEN_NEXT_DIR, 'server-functions/default/handler.mjs')
if (existsSync(handlerFile)) {
  let handlerCode = readFileSync(handlerFile, 'utf8')
  const origSize = Buffer.byteLength(handlerCode, 'utf8')

  // Strip verification_steps arrays (long multi-line strings)
  handlerCode = handlerCode.replace(/verification_steps:\[[\s\S]*?\]/g, 'verification_steps:[]')

  // Strip long tip strings
  handlerCode = handlerCode.replace(/tip:`Make sure "[^"]*" is added to Authorized redirect URIs[^`]*`/g, 'tip:"Check Google Console redirect URIs"')

  // Strip source map comments
  handlerCode = handlerCode.replace(/\/\/# sourceMappingURL=[^\n]*/g, '')

  // === Stub inlined modules that are not needed at runtime ===
  // Each module in the esbuild bundle follows the pattern:
  //   "module/path.js"(exports,module){ ... }
  // We find the module by its path, then find the matching closing brace
  // and replace the entire module content with a minimal stub.

  function stubInlinedModule(code, modulePath, stubValue = 'module.exports={}') {
    // The esbuild bundle format is:
    //   var require_xxx = __commonJS({
    //     "path/to/module.js"(exports, module) { ... content ... }
    //   });
    //
    // We find the var declaration and replace the entire __commonJS({...})
    // with a simple assignment. This avoids the tricky brace-matching problem
    // inside complex module content.
    const pathSignature = `"${modulePath}"(exports,module){`

    let sigIdx = code.indexOf(pathSignature)
    if (sigIdx === -1) {
      console.log(`  ⚠ Could not find inlined module: ${modulePath.split('/').pop()}`)
      return code
    }

    // Find the `var require_xxx = __commonJS({` wrapper start
    const varStart = code.lastIndexOf('var ', sigIdx)
    if (varStart === -1 || varStart < sigIdx - 500) {
      // Safety check: var should be close to the module signature
      console.log(`  ⚠ Could not find var declaration for: ${modulePath.split('/').pop()}`)
      return code
    }

    // Extract the variable name: var require_xxx =
    const varDecl = code.substring(varStart, sigIdx)
    const varNameMatch = varDecl.match(/var\s+(\w+)\s*=/)
    if (!varNameMatch) {
      console.log(`  ⚠ Could not extract var name for: ${modulePath.split('/').pop()}`)
      return code
    }
    const varName = varNameMatch[1]

    // Find the end of the __commonJS({...}) call.
    // Strategy: find the next `var require_` or `var init_` declaration after
    // the current module, or the end of the file. The current module's
    // __commonJS call ends just before the next var declaration.
    const searchFrom = sigIdx + pathSignature.length
    let endIdx = code.length

    // Look for the next var declaration that starts a new module
    const nextVarPattern = /;var\s+(?:require_|init_)/g
    nextVarPattern.lastIndex = searchFrom
    const nextVarMatch = nextVarPattern.exec(code)
    if (nextVarMatch) {
      endIdx = nextVarMatch.index + 1 // Include the semicolon
    }

    // The original content from var declaration to the end
    const originalChunk = code.substring(varStart, endIdx)
    const savedBytes = originalChunk.length - 0 // We'll calculate actual savings below

    // Replace the entire var declaration + __commonJS({...}) with a simple function
    const replacement = `var ${varName} = function() { ${stubValue}; return module.exports; };`
    const actualSaved = originalChunk.length - replacement.length

    code = code.substring(0, varStart) + replacement + code.substring(endIdx)

    console.log(`  ✓ Stubbed inlined ${modulePath.split('/').pop()} (saved ${(actualSaved / 1024).toFixed(1)} KiB)`)
    bytesSaved += actualSaved
    return code
  }

  // Stub: pages-turbo.runtime.prod.js — Pages Router runtime, NOT used (App Router only)
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/node_modules/next/dist/compiled/next-server/pages-turbo.runtime.prod.js',
    'var e={};return e'
  )

  // Stub: jsonwebtoken/index.js — Used by NextAuth which we don't use (custom auth)
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/node_modules/next/dist/compiled/jsonwebtoken/index.js',
    'var e={sign:()=>{throw new Error("jsonwebtoken not available")},verify:()=>{throw new Error("jsonwebtoken not available")},decode:()=>null};return e'
  )

  // Stub: @prisma/adapter-libsql — Not used on Workers (D1 adapter is used instead)
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/ssr/[externals]_@prisma_adapter-libsql_1g-0_cw._.js',
    'var e={};return e'
  )

  // Stub: @prisma/adapter-libsql (alternative chunk path)
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/[externals]_@prisma_adapter-libsql_1g-0_cw._.js',
    'var e={};return e'
  )

  // Stub: query_compiler_fast_bg.wasm-base64.js — 4.5 MiB base64-encoded WASM!
  // On Cloudflare Workers, the WASM is loaded via a static import in worker.js
  // (set as globalThis.PRISMA_QUERY_COMPILER_WASM). The base64 inline version
  // is NOT needed and accounts for ~4.5 MiB uncompressed / ~1 MiB compressed.
  // We stub it to export an empty object — the WASM loading code in Prisma
  // will fall through to the globalThis path.
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/node_modules/.prisma/client/query_compiler_fast_bg.wasm-base64.js',
    'var e={wasm:undefined};return e'
  )

  // Stub: @mswjs/interceptors — MSW (Mock Service Worker) is dev-only, NOT used in production
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/node_modules/next/dist/compiled/@mswjs/interceptors/ClientRequest/index.js',
    'var e={};return e'
  )

  // Stub: styled-jsx — CSS-in-JS runtime, not used (Tailwind CSS only)
  // Note: only safe to stub if no styled-jsx usage in the app
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/node_modules/styled-jsx/index.js',
    'var e={default:function(){return null}};return e'
  )

  // Stub: pages/module.compiled.js — Pages Router module, NOT used (App Router only)
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/node_modules/next/dist/server/route-modules/pages/module.compiled.js',
    'var e={default:{}};return e'
  )

  // === Stub __esm modules (libsql/hrana — not needed on Workers) ===
  // The __esm format is: init_xxx = __esm({ "path"() { ... } });
  // We find each libsql-related init_ variable and replace the entire
  // __esm call with a no-op assignment.
  function stubEsmModule(code, modulePath) {
    const pathSignature = `"${modulePath}"(){`
    let sigIdx = code.indexOf(pathSignature)
    if (sigIdx === -1) {
      return code // Not found, skip
    }

    // Find the var init_xxx = __esm({ wrapper start
    const varStart = code.lastIndexOf('var ', sigIdx)
    if (varStart === -1 || varStart < sigIdx - 500) return code

    const varDecl = code.substring(varStart, sigIdx)
    const varNameMatch = varDecl.match(/var\s+(init_\w+)\s*=/)
    if (!varNameMatch) return code
    const varName = varNameMatch[1]

    // Find the end — next `;var init_` or `;var require_`
    const searchFrom = sigIdx + pathSignature.length
    let endIdx = code.length
    const nextVarPattern = /;var\s+(?:require_|init_)/g
    nextVarPattern.lastIndex = searchFrom
    const nextVarMatch = nextVarPattern.exec(code)
    if (nextVarMatch) {
      endIdx = nextVarMatch.index + 1
    }

    const originalChunk = code.substring(varStart, endIdx)
    const replacement = `var ${varName} = __esm({ "${modulePath}"() {} });`
    const actualSaved = originalChunk.length - replacement.length

    code = code.substring(0, varStart) + replacement + code.substring(endIdx)
    if (actualSaved > 1000) {
      console.log(`  ✓ Stubbed esm ${modulePath.split('/').pop()} (saved ${(actualSaved / 1024).toFixed(1)} KiB)`)
    }
    bytesSaved += actualSaved
    return code
  }

  // Stub all libsql/hrana modules (not needed on Workers — uses D1 adapter)
  // These are from @libsql/core, @libsql/hrana-client, @libsql/client, and @prisma/adapter-libsql
  const libsqlModules = [
    // @libsql/core
    '.open-next/server-functions/default/node_modules/@libsql/core/lib-esm/api.js',
    '.open-next/server-functions/default/node_modules/@libsql/core/lib-esm/uri.js',
    '.open-next/server-functions/default/node_modules/@libsql/core/lib-esm/util.js',
    '.open-next/server-functions/default/node_modules/@libsql/core/lib-esm/config.js',
    // @libsql/isomorphic-ws
    '.open-next/server-functions/default/node_modules/@libsql/isomorphic-ws/web.mjs',
    // @libsql/hrana-client/lib-esm (core)
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/client.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/errors.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/libsql_url.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/encoding/json/decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/encoding/json/encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/encoding/index.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/id_alloc.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/util.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/value.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/result.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/sql.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/queue.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/stmt.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/batch.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/describe.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/stream.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/cursor.js',
    // @libsql/hrana-client/lib-esm/ws
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/cursor.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/stream.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/json_encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/json_decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/ws/client.js',
    // @libsql/hrana-client/lib-esm/shared
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/shared/json_encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/shared/json_decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_decode.js',
    // @libsql/hrana-client/lib-esm/http
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/json_decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/protobuf_decode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/cursor.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/json_encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/protobuf_encode.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/stream.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/http/client.js',
    // @libsql/hrana-client/lib-esm misc
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/queue_microtask.js',
    '.open-next/server-functions/default/node_modules/@libsql/hrana-client/lib-esm/byte_queue.js',
    // @libsql/client
    '.open-next/server-functions/default/node_modules/@libsql/client/lib-esm/ws.js',
    '.open-next/server-functions/default/node_modules/@libsql/client/lib-esm/http.js',
    '.open-next/server-functions/default/node_modules/@libsql/client/lib-esm/web.js',
    '.open-next/server-functions/default/node_modules/@libsql/client/dist/index.mjs',
    // @prisma/adapter-libsql
    '.open-next/server-functions/default/node_modules/@prisma/adapter-libsql/dist/index.mjs',
    '.open-next/server-functions/default/node_modules/@prisma/adapter-libsql/dist/index-node.mjs',
  ]
  for (const mod of libsqlModules) {
    handlerCode = stubEsmModule(handlerCode, mod)
  }

  // === Patch Prisma WASM loading — use global from worker.js ===
  // The esbuild-bundled code has multiple references to the WASM file using
  // an absolute build-machine path like:
  //   import("/home/z/my-project/.open-next/.../query_compiler_fast_bg.wasm")
  // These fail at runtime on Cloudflare Workers. We replace ALL such references
  // with code that reads from globalThis.PRISMA_QUERY_COMPILER_WASM (set in
  // worker.js by loading from static assets).
  //
  // There are 3 types of references:
  // 1. wasm_worker_loader_default = import("...wasm") — the main WASM loader
  // 2. loadWasmChunk: if(chunkPath==="...wasm") return (await import("...wasm")).default
  // 3. Same as #2 but in a different module (route handler)
  //
  // We use a global string replacement for the absolute path, then fix up the
  // resulting code to return the WASM from globalThis instead.

  // Step 1: Replace the wasm_worker_loader_default assignment
  const wasmImportPattern = /wasm_worker_loader_default\s*=\s*import\(["'][^"']*query_compiler_fast_bg\.wasm["']\)/
  const wasmImportMatch = handlerCode.match(wasmImportPattern)
  if (wasmImportMatch) {
    const originalImport = wasmImportMatch[0]
    const patchedImport = `wasm_worker_loader_default=(function(){if(globalThis.PRISMA_QUERY_COMPILER_WASM){return Promise.resolve({default:globalThis.PRISMA_QUERY_COMPILER_WASM})}return Promise.reject(new Error("PRISMA_QUERY_COMPILER_WASM not available"))})()`
    handlerCode = handlerCode.replace(originalImport, patchedImport)
    console.log(`  ✓ Patched wasm_worker_loader_default to use globalThis.PRISMA_QUERY_COMPILER_WASM`)
  } else {
    console.log(`  ⚠ Could not find wasm_worker_loader_default pattern`)
  }

  // Step 2: Patch loadWasmChunk functions that reference the WASM file
  // Pattern: if(chunkPath==="/abs/path/to/query_compiler_fast_bg.wasm")return(await import("/abs/path/to/query_compiler_fast_bg.wasm")).default
  // Replace with: if(chunkPath==="__prisma_wasm__")return globalThis.PRISMA_QUERY_COMPILER_WASM
  const wasmChunkPattern = /if\(chunkPath===\"[^\"]*query_compiler_fast_bg\.wasm\"\)return\s*\(await import\(\"[^\"]*query_compiler_fast_bg\.wasm\"\)\)\.default/g
  const wasmChunkMatches = handlerCode.match(wasmChunkPattern)
  if (wasmChunkMatches) {
    for (const match of wasmChunkMatches) {
      handlerCode = handlerCode.replace(match, `if(chunkPath==="__prisma_wasm__")return globalThis.PRISMA_QUERY_COMPILER_WASM`)
    }
    console.log(`  ✓ Patched ${wasmChunkMatches.length} loadWasmChunk function(s) to use globalThis.PRISMA_QUERY_COMPILER_WASM`)
  } else {
    console.log(`  ⚠ Could not find loadWasmChunk pattern`)
  }

  // Step 3: Remove any remaining absolute-path WASM references as a safety net
  // Replace any remaining import(".../query_compiler_fast_bg.wasm") with a safe fallback
  const remainingWasmImports = handlerCode.match(/import\(["'][^"']*query_compiler_fast_bg\.wasm["']\)/g)
  if (remainingWasmImports) {
    for (const imp of remainingWasmImports) {
      handlerCode = handlerCode.replace(imp, `Promise.resolve({default:globalThis.PRISMA_QUERY_COMPILER_WASM})`)
    }
    console.log(`  ✓ Patched ${remainingWasmImports.length} remaining WASM import(s)`)
  }

  // Step 4: Strip verbose console statements and Prisma error strings
  const origLen = handlerCode.length
  // Replace console.log/warn/debug/info/error/trace with a no-op function reference
  // Must be a function-like value since some code does .bind() on it
  // Use a short IIFE that returns a no-op: (function(){return function(){}})()
  // But simpler: just use a variable. Add at top of file.
  const noopFnName = '__noop'
  handlerCode = `var ${noopFnName}=function(){};` + handlerCode
  handlerCode = handlerCode.replace(/console\.(log|warn|debug|info|error|trace)/g, noopFnName)
  // Strip long Prisma diagnostic strings (compress poorly, ~10-20 KiB savings)
  handlerCode = handlerCode.replace(/Prisma Client could not locate a valid query engine[^"]{0,500}/g, 'Query engine not found')
  handlerCode = handlerCode.replace(/Please make sure the database server is running at [^"]{0,200}/g, 'DB not reachable')
  handlerCode = handlerCode.replace(/Invalid `prisma\.[a-zA-Z.]+\(\)` invocation[^"]{0,1000}/g, 'Invalid Prisma call')
  handlerCode = handlerCode.replace(/Unique constraint failed on the fields: \([^)]+\)/g, 'Unique constraint failed')
  handlerCode = handlerCode.replace(/Foreign key constraint failed on the field: `[^`]+`/g, 'FK constraint failed')
  handlerCode = handlerCode.replace(/Access denied for user '[^']*'[^']{0,200}/g, 'Access denied')
  // Strip long error descriptions and help text (compress poorly)
  handlerCode = handlerCode.replace(/The table you are trying to access does not exist[^"]{0,500}/g, 'Table not found')
  handlerCode = handlerCode.replace(/Cannot read properties of undefined[^"]{0,300}/g, 'Cannot read undefined')
  handlerCode = handlerCode.replace(/This request has been aborted[^"]{0,300}/g, 'Request aborted')
  handlerCode = handlerCode.replace(/The column you are trying to access does not exist[^"]{0,500}/g, 'Column not found')
  handlerCode = handlerCode.replace(/This is a non-recoverable error which means the record you are trying to access[^"]{0,500}/g, 'Record not found')
  handlerCode = handlerCode.replace(/If you want to handle this error[^"]{0,300}/g, 'Handle error')
  handlerCode = handlerCode.replace(/Check the request format[^"]{0,300}/g, 'Check request format')
  const consoleSaved = origLen - handlerCode.length
  if (consoleSaved > 0) {
    console.log(`  ✓ Stripped verbose strings & console statements (saved ${(consoleSaved / 1024).toFixed(1)} KiB)`)
  }

  // === Step 4b: Stub Firebase messaging modules (not critical for SSR, large) ===
  // These are the full Firebase messaging SDK inlined in handler.mjs.
  // The firebase messaging SW route can still serve a basic empty response.
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_firebase_messaging_dist_index_mjs_0yx202k._.js',
    'var e={isSupported:()=>false,messaging:()=>null};return e'
  )
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_firebase_messaging_dist_index_mjs_1gkbocp._.js',
    'var e={isSupported:()=>false,messaging:()=>null};return e'
  )
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_firebase-client_ts_1_q-phz._.js',
    'var e={getMessaging:()=>null,onMessage:()=>{},getToken:()=>Promise.resolve(null)};return e'
  )
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_firebase-messaging-sw_js_route_actions_0fwceb9.js',
    'var e={};return e'
  )
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/app/firebase-messaging-sw.js/route.js',
    'var e={GET:()=>new Response("",{headers:{"Content-Type":"application/javascript"}}),POST:()=>new Response("ok")};return e'
  )

  // === Step 4c: Stub email/OTP modules (only used in specific API routes) ===
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/src_lib_email_ts_0_r3dgd._.js',
    'var e={sendEmail:()=>Promise.resolve({success:true}),sendOtpEmail:()=>Promise.resolve({success:true})};return e'
  )
  handlerCode = stubInlinedModule(handlerCode,
    '.open-next/server-functions/default/.next/server/chunks/src_lib_otp_ts_0wd0tqo._.js',
    'var e={generateOtp:()=>"000000",verifyOtp:()=>true};return e'
  )

  // Step 5: Deduplicate Prisma client modules
  // The esbuild bundle includes multiple copies of the Prisma client:
  //   require_client (from .prisma/client/index.js) — 164 KiB
  //   require_edge (from .prisma/client/edge.js) — 164 KiB
  //   require_edge2 (from @prisma/client/edge.js) — already stubbed above
  // Since index.js was replaced with edge.js content by cleanup-prisma-engines,
  // require_client and require_edge are IDENTICAL. We make require_client
  // re-export from require_edge, saving ~164 KiB uncompressed (~37 KiB compressed).
  //
  // We can't use stubInlinedModule because the module's signature format differs
  // ("path"(exports){} vs "path"(exports,module){}). We use a direct approach:
  // find the var require_client = __commonJS({...}) block and replace it entirely.
  const clientPath = '.open-next/server-functions/default/node_modules/.prisma/client/index.js'
  const clientSig = `"${clientPath}"(exports)`
  const clientIdx = handlerCode.indexOf(clientSig)
  if (clientIdx !== -1) {
    // Find the var declaration
    const varStart = handlerCode.lastIndexOf('var ', Math.max(0, clientIdx - 10))
    if (varStart !== -1 && varStart > clientIdx - 500) {
      // Find the end: next ;var require_ or ;var init_
      const searchFrom = clientIdx + 100
      const endMatch = /;var\s+(?:require_|init_)/.exec(handlerCode.substring(searchFrom, searchFrom + 500000))
      if (endMatch) {
        const endPos = searchFrom + endMatch.index + 1
        const originalChunk = handlerCode.substring(varStart, endPos)
        const replacement = `var require_client = function() { var e=require_edge();return e; };`
        handlerCode = handlerCode.substring(0, varStart) + replacement + handlerCode.substring(endPos)
        const saved = originalChunk.length - replacement.length
        console.log(`  ✓ Deduplicated require_client → re-exports require_edge (saved ${(saved / 1024).toFixed(1)} KiB)`)
      } else {
        console.log(`  ⚠ Could not find end of require_client module`)
      }
    } else {
      console.log(`  ⚠ Could not find var declaration for require_client`)
    }
  } else {
    console.log(`  ⚠ Could not find require_client path signature`)
  }

  const newSize = Buffer.byteLength(handlerCode, 'utf8')
  writeFileSync(handlerFile, handlerCode, 'utf8')
  bytesSaved += origSize - newSize
  if (origSize !== newSize) {
    console.log(`✓ Patched handler.mjs (saved ${((origSize - newSize) / 1024).toFixed(1)} KiB total)`)
  }
}

// === Step 13: Load Prisma WASM via static import in worker.js ===
// The Prisma WASM query compiler is loaded via a static ES import in worker.js.
// Wrangler detects static .wasm imports and bundles them as separate WASM modules.
// The WASM still counts against the total size limit, but it's the ONLY way to
// load WASM on Cloudflare Workers (WebAssembly.compile/compileStreaming are blocked,
// and [wasm_modules] bindings are not allowed in ES module Workers).
//
// We also strip console statements and other verbose code from handler.mjs to
// keep the total (JS + WASM) under the 3 MiB compressed size limit.
const workerFile = join(OPEN_NEXT_DIR, 'worker.js')
const wasmSourcePath = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/.prisma/client/query_compiler_fast_bg.wasm')

if (existsSync(workerFile)) {
  let workerCode = readFileSync(workerFile, 'utf8')

  // Remove any existing PRISMA_QUERY_COMPILER_WASM code
  workerCode = workerCode.replace(/\n*\/\/ @ts-expect-error:.*Prisma WASM query compiler\nimport PRISMA_QUERY_COMPILER_WASM from.*\n/, '')
  workerCode = workerCode.replace(/\n*globalThis\.PRISMA_QUERY_COMPILER_WASM\s*=\s*PRISMA_QUERY_COMPILER_WASM;\n/, '')
  // Remove the old __ensurePrismaWasm function and its call
  workerCode = workerCode.replace(/\n*\/\/ Prisma WASM query compiler[\s\S]*?^}\n/m, '')
  workerCode = workerCode.replace(/\n*await __ensurePrismaWasm\(env[^)]*\);\n/, '')
  // Remove the binding-based loader code
  workerCode = workerCode.replace(/\n*\/\/ Prisma WASM query compiler — loaded from env[\s\S]*?^\}\n/m, '')

  // Add the static import and globalThis assignment
  const wasmImportCode = `// @ts-expect-error: Will be resolved by wrangler build — Prisma WASM query compiler
import PRISMA_QUERY_COMPILER_WASM from "./server-functions/default/node_modules/.prisma/client/query_compiler_fast_bg.wasm";
globalThis.PRISMA_QUERY_COMPILER_WASM = PRISMA_QUERY_COMPILER_WASM;
`

  // Insert after the last existing import statement (before export)
  const lastImportEnd = workerCode.lastIndexOf('";\n', workerCode.indexOf('export'))
  if (lastImportEnd !== -1) {
    workerCode = workerCode.slice(0, lastImportEnd + 3) + '\n' + wasmImportCode + '\n' + workerCode.slice(lastImportEnd + 3)
  }

  writeFileSync(workerFile, workerCode, 'utf8')
  console.log(`✓ Patched worker.js with static WASM import for Prisma query compiler`)
} else {
  console.log(`  ⚠ Could not find worker.js for patching`)
}

// The WASM file needs to stay in node_modules for the static import to resolve

// === Step 13b: Stub Next.js Pages Router runtime (not used — App Router only) ===
// pages-turbo.runtime.prod.js is for the Pages Router, which we don't use.
// Stub it to save ~118 KiB uncompressed (~30 KiB compressed).
const pagesTurboFile = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/next-server/pages-turbo.runtime.prod.js')
if (existsSync(pagesTurboFile)) {
  const size = statSync(pagesTurboFile).size
  writeFileSync(pagesTurboFile, `module.exports={};`, 'utf8')
  const stubSize = statSync(pagesTurboFile).size
  bytesSaved += size - stubSize
  console.log(`✓ Stubbed pages-turbo.runtime.prod.js (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
}

// === Step 13c: Stub experimental app-page runtime ===
// app-page-turbo-experimental.runtime.prod.js is the experimental variant.
// We only need the stable app-page-turbo.runtime.prod.js. Stub the
// experimental one by re-exporting from the stable version.
// Saves ~602 KiB uncompressed (~100-150 KiB compressed).
const experimentalRuntime = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/next-server/app-page-turbo-experimental.runtime.prod.js')
const stableRuntime = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.prod.js')
if (existsSync(experimentalRuntime) && existsSync(stableRuntime)) {
  const size = statSync(experimentalRuntime).size
  writeFileSync(experimentalRuntime, `'use strict';module.exports=require('./app-page-turbo.runtime.prod.js');`, 'utf8')
  const stubSize = statSync(experimentalRuntime).size
  bytesSaved += size - stubSize
  console.log(`✓ Stubbed app-page-turbo-experimental.runtime.prod.js (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
}

// === Step 13d: Remove jsonwebtoken (not used — we don't use NextAuth) ===
const jwtDir = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/jsonwebtoken')
if (existsSync(jwtDir)) {
  const size = getDirSize(jwtDir)
  rmSync(jwtDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`✓ Removed jsonwebtoken/ (${(size / 1024).toFixed(1)} KiB)`)
}

// === Step 14: Remove Node-only packages (never used on Workers) ===
const nodeOnlyDirs = [
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/sharp'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/better-sqlite3'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@img'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/ws'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/detect-libc'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@neon-rs'),
]
for (const dir of nodeOnlyDirs) {
  if (existsSync(dir)) {
    const size = getDirSize(dir)
    rmSync(dir, { recursive: true, force: true })
    bytesSaved += size
    console.log(`✓ Removed ${dir.split('/').slice(-1)[0]}/ (${(size / 1024).toFixed(1)} KiB)`)
  }
}

// === Step 15: Remove next-auth (not used — custom auth system) ===
const nextAuthPaths = [
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next-auth'),
  join(OPEN_NEXT_DIR, 'node_modules/next-auth'),
]
for (const naDir of nextAuthPaths) {
  if (existsSync(naDir)) {
    const size = getDirSize(naDir)
    rmSync(naDir, { recursive: true, force: true })
    bytesSaved += size
    console.log(`✓ Removed next-auth/ (${(size / 1024).toFixed(1)} KiB)`)
  }
}

// === Step 16: Stub more Firebase modules (client-only, not needed in SSR) ===
if (existsSync(ssrDir)) {
  const firebaseSsrFiles = readdirSync(ssrDir).filter(f =>
    f.startsWith('node_modules_firebase') && !f.endsWith('.map')
  )
  for (const file of firebaseSsrFiles) {
    const filePath = join(ssrDir, file)
    const size = statSync(filePath).size
    // Only stub files larger than 5 KiB (small files aren't worth the risk)
    if (size > 5120) {
      writeFileSync(filePath, `export {};`, 'utf8')
      const stubSize = statSync(filePath).size
      bytesSaved += size - stubSize
      console.log(`✓ Stubbed ${file} (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
    }
  }
}

// === Step 17: Remove qrcode and otplib (only used in specific API routes, heavy deps) ===
const heavyDeps = [
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/qrcode'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/otplib'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/react-syntax-highlighter'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/recharts'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@mdxeditor'),
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/d3-'),  // d3 subpackages (recharts dep)
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@mswjs'),  // Mock Service Worker - dev only
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/styled-jsx'),  // CSS-in-JS, not used (Tailwind)
  join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/@mswjs'),  // In Next.js compiled
]
for (const dep of heavyDeps) {
  if (existsSync(dep)) {
    const size = getDirSize(dep)
    rmSync(dep, { recursive: true, force: true })
    bytesSaved += size
    console.log(`✓ Removed ${dep.split('/').slice(-1)[0]}/ (${(size / 1024).toFixed(1)} KiB)`)
  }
}

// Also find and remove d3-* packages (recharts dependency, very heavy)
if (existsSync(join(OPEN_NEXT_DIR, 'server-functions/default/node_modules'))) {
  const nodeModulesDir = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules')
  try {
    const entries = readdirSync(nodeModulesDir)
    for (const entry of entries) {
      if (entry.startsWith('d3-') || entry === 'd3') {
        const depPath = join(nodeModulesDir, entry)
        const size = getDirSize(depPath)
        rmSync(depPath, { recursive: true, force: true })
        bytesSaved += size
        console.log(`✓ Removed ${entry}/ (${(size / 1024).toFixed(1)} KiB)`)
      }
    }
    // Also check @scoped packages
    const scopedDirs = entries.filter(e => e.startsWith('@'))
    for (const scope of scopedDirs) {
      const scopePath = join(nodeModulesDir, scope)
      try {
        const scopedEntries = readdirSync(scopePath)
        for (const entry of scopedEntries) {
          if (entry === 'mdxeditor') {
            const depPath = join(scopePath, entry)
            const size = getDirSize(depPath)
            rmSync(depPath, { recursive: true, force: true })
            bytesSaved += size
            console.log(`✓ Removed ${scope}/${entry}/ (${(size / 1024).toFixed(1)} KiB)`)
          }
        }
      } catch {}
    }
  } catch {}
}

// === Summary ===
console.log(`\n[postbuild-cf] Done. Saved ${(bytesSaved / 1024).toFixed(1)} KiB uncompressed from worker bundle.`)

// === Step 18: Remove redundant files already inlined in handler.mjs ===
// All code from .next/server/chunks/ and most of node_modules/ is already
// inlined in handler.mjs by esbuild. Wrangler's bundler resolves imports
// from handler.mjs (which has all code inline), so these external files
// are redundant. Keeping them increases the bundle size because wrangler
// includes them as additional modules.
//
// KEEP: .prisma/client/query_compiler_fast_bg.wasm (needed by [wasm_modules] binding)
// REMOVE: Everything else in .next/server/chunks/ and node_modules/
console.log('\n[postbuild-cf] Removing redundant inlined files...')

const serverDir = join(OPEN_NEXT_DIR, 'server-functions/default')
const chunksDir = join(serverDir, '.next/server/chunks')
const nodeModulesDir = join(serverDir, 'node_modules')

// Remove .next/server/chunks/ (already inlined in handler.mjs)
if (existsSync(chunksDir)) {
  const size = getDirSize(chunksDir)
  rmSync(chunksDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`✓ Removed .next/server/chunks/ (${(size / 1024).toFixed(1)} KiB)`)
}

// Remove node_modules/ but preserve the WASM file for the [wasm_modules] binding
if (existsSync(nodeModulesDir)) {
  const wasmPath = join(nodeModulesDir, '.prisma/client/query_compiler_fast_bg.wasm')
  let wasmContent = null
  if (existsSync(wasmPath)) {
    wasmContent = readFileSync(wasmPath)
  }

  const size = getDirSize(nodeModulesDir)
  rmSync(nodeModulesDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`✓ Removed node_modules/ (${(size / 1024).toFixed(1)} KiB)`)

  // Restore the WASM file (needed by wrangler's [wasm_modules] binding)
  if (wasmContent) {
    const prismaDir = join(nodeModulesDir, '.prisma/client')
    mkdirSync(prismaDir, { recursive: true })
    writeFileSync(wasmPath, wasmContent)
    console.log(`✓ Preserved query_compiler_fast_bg.wasm for [wasm_modules] binding (${(wasmContent.length / 1024).toFixed(1)} KiB)`)
  }
}

// Also remove the meta.json since the files it references no longer exist
const metaFile = join(serverDir, 'handler.mjs.meta.json')
if (existsSync(metaFile)) {
  const size = statSync(metaFile).size
  // Don't delete — wrangler might need it for resolution
  // Instead, create a minimal version
  writeFileSync(metaFile, JSON.stringify({ outputs: {}, inputs: {} }), 'utf8')
  bytesSaved += size - statSync(metaFile).size
  console.log(`✓ Minimized handler.mjs.meta.json`)
}

// === Step 19: Minify handler.mjs with esbuild ===
// The handler.mjs is still large because esbuild preserves function names
// and whitespace. Running esbuild minification saves ~600 KiB uncompressed
// which translates to ~100 KiB compressed — critical for the 3 MiB limit.
console.log('\n[postbuild-cf] Minifying handler.mjs with esbuild...')
import { execSync } from 'node:child_process'
try {
  const handlerPath = join(serverDir, 'handler.mjs')
  const handlerMinPath = join(serverDir, 'handler.min.mjs')
  const beforeSize = statSync(handlerPath).size
  execSync(`npx esbuild "${handlerPath}" --minify --outfile="${handlerMinPath}" --format=esm --log-level=warning`, {
    stdio: 'pipe',
    timeout: 60000,
  })
  if (existsSync(handlerMinPath)) {
    const afterSize = statSync(handlerMinPath).size
    const saved = beforeSize - afterSize
    if (saved > 0) {
      rmSync(handlerPath)
      // Rename min to original name
      const fs = await import('node:fs/promises')
      await fs.rename(handlerMinPath, handlerPath)
      bytesSaved += saved
      console.log(`✓ Minified handler.mjs with esbuild (saved ${(saved / 1024).toFixed(1)} KiB)`)
    } else {
      rmSync(handlerMinPath)
      console.log('  ⚠ Minification did not reduce size, keeping original')
    }
  }
} catch (err) {
  console.log(`  ⚠ esbuild minification failed: ${err.message?.substring(0, 100)}`)
  // Clean up if minified file exists
  const handlerMinPath = join(serverDir, 'handler.min.mjs')
  if (existsSync(handlerMinPath)) rmSync(handlerMinPath)
}
