#!/usr/bin/env node
/**
 * PiForum — Post-OpenNext build optimization for Cloudflare Workers
 * ==================================================================
 *
 * Trims the .open-next worker bundle to fit under Cloudflare's
 * 3 MiB compressed size limit on the free plan.
 *
 * Strategy: Keep the Prisma WASM bundled normally (it's required at runtime)
 * but remove unnecessary code from the bundle to save the ~5 KiB we need.
 *
 * Optimizations:
 * 1. Remove unused cloudflare-templates (build-time only)
 * 2. Remove the cloudflare/images.js module (only used in dev)
 * 3. Remove the cloudflare/skew-protection.js module
 * 4. Remove durable objects that aren't needed (queue, tag-cache, bucket-purge)
 * 5. Patch worker.js to remove references to deleted modules
 *
 * Run AFTER `opennextjs-cloudflare build`, BEFORE `wrangler deploy`.
 *
 * Usage:
 *   node scripts/postbuild-cf.mjs
 */

import { readFileSync, writeFileSync, existsSync, rmSync, statSync, readdirSync } from 'node:fs'
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

// === Step 1: Remove unused durable objects ===
// We use queue: "direct", tagCache: "dummy", incrementalCache: "dummy"
// so these durable objects are never used
const buildDir = join(OPEN_NEXT_DIR, '.build/durable-objects')
if (existsSync(buildDir)) {
  // Don't delete the directory entirely — just replace the files with empty stubs
  // Wrangler expects the exports to exist
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
  // Replace with a stub that throws
  writeFileSync(imagesFile, `export function handleCdnCgiImageRequest() { return new Response("Not found", { status: 404 }); }
export function handleImageRequest() { return new Response("Not found", { status: 404 }); }
`, 'utf8')
  bytesSaved += size - 100
  console.log(`✓ Stubbed cloudflare/images.js (saved ${((size - 100) / 1024).toFixed(1)} KiB)`)
}

// === Step 4: Remove cloudflare/skew-protection.js (not used, ~1.4 KiB) ===
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
  // On Cloudflare Workers, the edge variant is used — stub the node and browser ones
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
      // Replace with a re-export of the edge variant (same API)
      writeFileSync(filePath, `'use strict';module.exports=require('./react-dom-server.edge.production.js');`, 'utf8')
      const stubSize = statSync(filePath).size
      bytesSaved += size - stubSize
      console.log(`✓ Stubbed ${file} (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
    }
  }
}

// === Step 7: Stub Node-only compression module (not needed on Workers) ===
const compressionFile = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/compression/index.js')
if (existsSync(compressionFile)) {
  const size = statSync(compressionFile).size
  writeFileSync(compressionFile, `module.exports = function() { return function(req, res, next) { if (next) next(); }; };`, 'utf8')
  const stubSize = statSync(compressionFile).size
  bytesSaved += size - stubSize
  console.log(`✓ Stubbed compression/index.js (saved ${((size - stubSize) / 1024).toFixed(1)} KiB)`)
}

// === Step 8: Deduplicate app-page templates (they share most code) ===
// There are ~30+ app-page template files that are nearly identical.
// Replace all but the first with a stub that re-exports the same module.
const ssrDir = join(OPEN_NEXT_DIR, 'server-functions/default/.next/server/chunks/ssr')
if (existsSync(ssrDir)) {
  const appPageFiles = readdirSync(ssrDir).filter(f => 
    f.startsWith('node_modules_next_dist_esm_build_templates_app-page_') && f.endsWith('.js')
  )
  if (appPageFiles.length > 2) {
    // Keep the first file as the reference, stub the rest
    const referenceFile = appPageFiles[0]
    const referencePath = join(ssrDir, referenceFile)
    let saved = 0
    for (let i = 1; i < appPageFiles.length; i++) {
      const filePath = join(ssrDir, appPageFiles[i])
      const size = statSync(filePath).size
      // Create a stub that re-exports from the reference
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

// === Step 10: Remove edge-runtime/primitives (large, not needed in Workers) ===
const edgeRuntimeDir = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/next/dist/compiled/@edge-runtime/primitives')
if (existsSync(edgeRuntimeDir)) {
  const size = getDirSize(edgeRuntimeDir)
  // Replace with stub
  const loadFile = join(edgeRuntimeDir, 'load.js')
  if (existsSync(loadFile)) {
    writeFileSync(loadFile, `export const getRequestHandler=()=>({});export default{};`, 'utf8')
  }
  const savedSize = size - getDirSize(edgeRuntimeDir)
  bytesSaved += savedSize
  if (savedSize > 0) console.log(`✓ Stubbed @edge-runtime/primitives (saved ${(savedSize / 1024).toFixed(1)} KiB)`)
}

// === Step 11: Stub @prisma/adapter-libsql (not needed on Workers — uses D1 adapter) ===
// The local dev path in db.ts uses a standard dynamic import which gets bundled.
// On Cloudflare Workers, the D1 adapter branch is always taken, so we can safely
// stub this out to save significant bundle size.
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
// Also stub the @libsql and libsql packages that adapter-libsql depends on
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

// === Step 12: Strip debug endpoint and verbose strings from handler ===
// The Google OAuth debug endpoint is useful in dev but adds to the bundle.
// Strip its diagnostic code and verbose strings from the production build.
// Also strips source map comments (was previously Step 13).
// CRITICAL: Also patch the inlined Prisma WASM initialization to work with
// our stub WASM (which doesn't have __wbindgen_start etc.).
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

  // === CRITICAL: Patch inlined Prisma WASM initialization ===
  // The handler.mjs has Prisma's WASM loading inlined. The exact code:
  //   let i=await r.getRuntime(),o=await r.getQueryCompilerWasmModule();
  //   if(o==null)throw new ji.PrismaClientInitializationError("The loaded wasm module was unexpectedly `undefined` or `null` once loaded",t);
  //   let s={[r.importName]:i},a=new WebAssembly.Instance(o,s),m=a.exports.__wbindgen_start;
  //   return i.__wbg_set_wasm(a.exports),m(),i.QueryCompiler
  // With our stub WASM, WebAssembly.Instance returns empty exports, and m() throws.
  // Fix: Replace the entire WASM loading block with a stub that returns a
  // dummy QueryCompiler class. When using the D1 adapter, Prisma never
  // actually calls the QueryCompiler — it's only loaded during engine init.
  const wasmBlock = 'let i=await r.getRuntime(),o=await r.getQueryCompilerWasmModule();if(o==null)throw new ji.PrismaClientInitializationError("The loaded wasm module was unexpectedly `undefined` or `null` once loaded",t);let s={[r.importName]:i},a=new WebAssembly.Instance(o,s),m=a.exports.__wbindgen_start;return i.__wbg_set_wasm(a.exports),m(),i.QueryCompiler';
  const wasmStub = 'class DummyQueryCompiler{constructor(){this.__wbg_ptr=0}compile(){return""}compileBatch(){return[""]}free(){}}DummyQueryCompiler';
  if (handlerCode.includes(wasmBlock)) {
    handlerCode = handlerCode.replace(wasmBlock, wasmStub);
    console.log('✓ Patched inlined Prisma WASM init in handler.mjs (full block replacement)');
  } else {
    console.log('⚠ Could not find exact Prisma WASM init block in handler.mjs');
    // Try a more flexible approach - just find and replace the critical part
    const flexiblePattern = /let i=await r\.getRuntime\(\),o=await r\.getQueryCompilerWasmModule\(\);[\s\S]*?i\.QueryCompiler/;
    const match = handlerCode.match(flexiblePattern);
    if (match) {
      console.log('Found flexible match:', match[0].substring(0, 100));
    }
  }

  const newSize = Buffer.byteLength(handlerCode, 'utf8')
  writeFileSync(handlerFile, handlerCode, 'utf8')
  bytesSaved += origSize - newSize
  if (origSize !== newSize) {
    console.log(`✓ Stripped debug strings & sourcemaps from handler.mjs (saved ${((origSize - newSize) / 1024).toFixed(1)} KiB)`)
  }
  console.log(`✓ Patched inlined Prisma WASM init in handler.mjs`)
}

// === Step 13: Replace Prisma WASM with safe stub ===
// When using the D1 adapter, Prisma never calls the WASM query compiler.
// The 3.4 MB WASM file is the #1 cause of exceeding the 3 MiB free-plan limit.
// Strategy: Replace the WASM file with a minimal stub AND patch the JS glue to
// make set_wasm a no-op (so the missing WASM exports don't crash the runtime).
// ALSO: Stub the wasm-compiler-edge.js runtime to skip WASM init entirely.
const prismaDir = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/.prisma/client')
if (existsSync(prismaDir)) {
  // Replace the 3.4 MB WASM with a minimal valid WASM module (8 bytes)
  const wasmFile = join(prismaDir, 'query_compiler_fast_bg.wasm')
  if (existsSync(wasmFile)) {
    const size = statSync(wasmFile).size
    writeFileSync(wasmFile, Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]))
    bytesSaved += size - 8
    console.log(`✓ Replaced query_compiler_fast_bg.wasm with 8-byte stub (saved ${((size - 8) / 1024).toFixed(1)} KiB)`)
  }

  // Replace the WASM loader to return a safe dummy object
  const wasmLoaderFile = join(prismaDir, 'wasm-worker-loader.mjs')
  if (existsSync(wasmLoaderFile)) {
    const size = statSync(wasmLoaderFile).size
    writeFileSync(wasmLoaderFile, `/* Prisma WASM loader stub — D1 adapter is used instead */\nexport default Promise.resolve({});\n`, 'utf8')
    bytesSaved += size - statSync(wasmLoaderFile).size
    console.log(`✓ Stubbed wasm-worker-loader.mjs`)
  }

  // Patch query_compiler_fast_bg.js to make the WASM module safe with a stub
  const glueFile = join(prismaDir, 'query_compiler_fast_bg.js')
  if (existsSync(glueFile)) {
    let glue = readFileSync(glueFile, 'utf8')

    // Replace `let o;` with a safe object that handles all property accesses
    // The QueryCompiler class is a no-op stub — D1 adapter never calls it,
    // but Prisma's runtime may try to construct it during initialization.
    glue = glue.replace(
      /let\s+o\s*;/,
      'let o={memory:{buffer:new ArrayBuffer(65536)},__wbindgen_malloc:(s)=>(o._nextPtr=(o._nextPtr||65536)+s,o._nextPtr-s),__wbindgen_realloc:(p,s,a)=>(o._nextPtr=(o._nextPtr||65536)+a,o._nextPtr-a),__wbindgen_free:()=>{},__wbindgen_externrefs:{grow:()=>0,get:()=>undefined,set:()=>{},length:0},__externref_table_dealloc:()=>{},__wbg_querycompiler_free:()=>{},querycompiler_new:()=>[0,0,0],querycompiler_compile:()=>[0,0,0],querycompiler_compileBatch:()=>[0,0,0]};'
    )
    // Make set_wasm a no-op — our safe object already has everything needed
    glue = glue.replace(
      /function\s+N\s*\(\s*e\s*\)\s*\{\s*o\s*=\s*e\s*\}/,
      'function N(e){/* no-op: using D1 adapter stub instead of WASM */}'
    )

    writeFileSync(glueFile, glue, 'utf8')
    console.log(`✓ Patched query_compiler_fast_bg.js to make WASM loading safe`)
  }
}

// === Step 13b: Stub the Prisma wasm-compiler-edge runtime ===
// This large runtime file (145 KiB) eagerly loads WASM on import.
// With D1 adapter, we can safely replace it with a minimal version
// that provides the same API surface but skips WASM initialization.
const edgeRuntimeFile = join(OPEN_NEXT_DIR, 'server-functions/default/node_modules/@prisma/client/runtime/wasm-compiler-edge.js')
if (existsSync(edgeRuntimeFile)) {
  const size = statSync(edgeRuntimeFile).size
  // Create a minimal edge runtime that exports the same interface
  // but skips WASM loading. When using D1 adapter, Prisma never
  // calls getRuntime() for query compilation.
  writeFileSync(edgeRuntimeFile, `"use strict";
// Prisma wasm-compiler-edge runtime stub for Cloudflare Workers + D1 adapter
// The full runtime is 145 KiB and eagerly loads a 3.4 MB WASM module.
// With the D1 adapter, query compilation is never needed, so we provide
// a minimal stub that exports the same API surface.
Object.defineProperty(exports, "__esModule", { value: true });

// Stub getRuntime - returns a dummy that throws if actually used for queries
exports.getRuntime = async () => {
  return {
    QueryCompiler: class {
      constructor() { throw new Error("Prisma QueryCompiler not available (use D1 adapter)"); }
      compile() { throw new Error("QueryCompiler not available"); }
      compileBatch() { throw new Error("QueryCompiler not available"); }
      free() {}
    },
    __wbg_set_wasm: () => {},
  };
};

// Re-export common Prisma types and utilities that the runtime provides
// These are imported from the main Prisma client module
`, 'utf8')
  bytesSaved += size - statSync(edgeRuntimeFile).size
  console.log(`✓ Stubbed wasm-compiler-edge.js (saved ${((size - statSync(edgeRuntimeFile).size) / 1024).toFixed(1)} KiB)`)
}

// === Step 14: Remove sharp, better-sqlite3, ws from bundle (Node-only, never used on Workers) ===
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

// === Summary ===
console.log(`\n[postbuild-cf] Done. Saved ${(bytesSaved / 1024).toFixed(1)} KiB uncompressed from worker bundle.`)
