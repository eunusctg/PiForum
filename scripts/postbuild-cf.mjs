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

// === Step 12: Strip source map comments from handler.mjs ===
const handlerFile = join(OPEN_NEXT_DIR, 'server-functions/default/handler.mjs')
if (existsSync(handlerFile)) {
  let handlerCode = readFileSync(handlerFile, 'utf8')
  const originalSize = Buffer.byteLength(handlerCode, 'utf8')

  // Only strip source map comments — these are safe to remove
  handlerCode = handlerCode.replace(/\n\/\/# sourceMappingURL=[^\n]*/g, '')

  writeFileSync(handlerFile, handlerCode, 'utf8')
  const newSize = Buffer.byteLength(handlerCode, 'utf8')
  bytesSaved += originalSize - newSize
  if (originalSize !== newSize) {
    console.log(`✓ Trimmed handler.mjs sourcemaps (saved ${((originalSize - newSize) / 1024).toFixed(1)} KiB)`)
  }
}

// === Summary ===
console.log(`\n[postbuild-cf] Done. Saved ${(bytesSaved / 1024).toFixed(1)} KiB uncompressed from worker bundle.`)
