#!/usr/bin/env node
/**
 * PiForum — Post-OpenNext build optimization for Cloudflare Workers
 * ==================================================================
 *
 * Shrinks the .open-next worker bundle to fit under Cloudflare's
 * 3 MiB compressed size limit on the free plan.
 *
 * Key optimization: Replace the Prisma WASM import with a runtime fetch
 * from static assets. The WASM file is moved from server-functions/
 * (bundled by wrangler) to assets/ (served as static file). The handler.mjs
 * import that references the .wasm is patched to load it at runtime.
 *
 * Run AFTER `opennextjs-cloudflare build`, BEFORE `wrangler deploy`.
 *
 * Usage:
 *   node scripts/postbuild-cf.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const OPEN_NEXT_DIR = '.open-next'
const ASSETS_DIR = join(OPEN_NEXT_DIR, 'assets')
const SERVER_DIR = join(OPEN_NEXT_DIR, 'server-functions/default')
const PRISMA_DIR = join(SERVER_DIR, 'node_modules/.prisma/client')
const HANDLER = join(SERVER_DIR, 'handler.mjs')

let bytesSaved = 0

function getSize(path) {
  if (!existsSync(path)) return 0
  return statSync(path).size
}

function deleteIf(path) {
  if (existsSync(path)) {
    const size = statSync(path).size
    rmSync(path, { force: true })
    bytesSaved += size
    console.log(`  deleted ${path} (${(size / 1024).toFixed(1)} KiB)`)
  }
}

console.log('[postbuild-cf] Optimizing Cloudflare Worker bundle...\n')

// === Step 1: Patch handler.mjs to remove the .wasm import ===
// The wrangler-external plugin converts .wasm imports to absolute paths.
// We need to replace these with runtime WASM loading code.
if (existsSync(HANDLER)) {
  let code = readFileSync(HANDLER, 'utf8')
  const originalSize = code.length

  // Pattern 1: import from absolute .wasm path (placed by wrangler-external plugin)
  // e.g.: import x from "/home/z/my-project/.open-next/.../query_compiler_fast_bg.wasm";
  const wasmImportRegex = /import\s+(\w+)\s+from\s*["'][^"']*query_compiler_fast_bg\.wasm["'];?/g
  const matches = [...code.matchAll(wasmImportRegex)]

  if (matches.length > 0) {
    console.log(`  Found ${matches.length} .wasm import(s) in handler.mjs`)

    for (const match of matches) {
      const fullMatch = match[0]
      const importName = match[1]
      console.log(`  Replacing import: ${importName} from .wasm`)

      // Replace the static import with a runtime WebAssembly loader
      // that fetches the WASM from the static assets URL
      code = code.replace(
        fullMatch,
        `// [PiForum] Prisma WASM loaded at runtime from static assets
var ${importName} = (async()=>{try{const r=await fetch("/_wasm/prisma-query-compiler.wasm");if(r.ok){const b=await r.arrayBuffer();return await WebAssembly.compile(b)}}catch(e){console.error("[prisma-wasm]",e)}throw new Error("Prisma WASM not found")})()`
      )
    }
  }

  // Pattern 2: Dynamic import from absolute .wasm path
  // e.g.: import("/home/z/.../query_compiler_fast_bg.wasm")
  const dynamicImportRegex = /import\(\s*["'][^"']*query_compiler_fast_bg\.wasm["']\s*\)/g
  const dynamicMatches = [...code.matchAll(dynamicImportRegex)]

  if (dynamicMatches.length > 0) {
    console.log(`  Found ${dynamicMatches.length} dynamic .wasm import(s) in handler.mjs`)

    for (const match of dynamicMatches) {
      code = code.replace(
        match[0],
        `(async()=>{const r=await fetch("/_wasm/prisma-query-compiler.wasm");if(r.ok){const b=await r.arrayBuffer();return await WebAssembly.compile(b)}throw new Error("Prisma WASM not found")})()`
      )
    }
  }

  // Pattern 3: Check for the wasm-worker-loader dynamic import
  // This is the `export default import('./query_compiler_fast_bg.wasm')` from wasm-worker-loader.mjs
  // which was already bundled into handler.mjs by esbuild
  // The import may appear as a path like "/abs/path/.open-next/.../query_compiler_fast_bg.wasm"
  const absWasmRegex = /[a-zA-Z0-9_]+\s*=\s*import\s*\(\s*["'][^"']*\.open-next[^"']*query_compiler_fast_bg\.wasm["']\s*\)/g
  const absMatches = [...code.matchAll(absWasmRegex)]
  if (absMatches.length > 0) {
    console.log(`  Found ${absMatches.length} bundled .wasm dynamic import(s)`)
    for (const match of absMatches) {
      code = code.replace(
        match[0],
        `${match[0].split('=')[0].trim()}=(async()=>{const r=await fetch("/_wasm/prisma-query-compiler.wasm");if(r.ok){const b=await r.arrayBuffer();return await WebAssembly.compile(b)}throw new Error("Prisma WASM not found")})()`
      )
    }
  }

  if (code.length !== originalSize) {
    writeFileSync(HANDLER, code, 'utf8')
    console.log(`  Patched handler.mjs (size change: ${originalSize} → ${code.length} bytes)`)
  } else {
    console.log('  No .wasm imports found in handler.mjs (checking for other patterns...)')

    // Try a broader search for any reference to query_compiler_fast_bg.wasm
    if (code.includes('query_compiler_fast_bg.wasm')) {
      console.log('  WARNING: Found "query_compiler_fast_bg.wasm" string in handler.mjs but could not patch it automatically')
      console.log('  Attempting broader replacement...')

      // Replace all occurrences of the .wasm path
      code = code.replace(
        /["'][^"']*query_compiler_fast_bg\.wasm["']/g,
        '"/_wasm/prisma-query-compiler.wasm"'
      )

      if (code.includes('/_wasm/prisma-query-compiler.wasm')) {
        writeFileSync(HANDLER, code, 'utf8')
        console.log('  Patched handler.mjs (replaced .wasm paths with asset URLs)')
      }
    }
  }
}

// === Step 2: Move Prisma WASM to static assets ===
const WASM_FILE = join(PRISMA_DIR, 'query_compiler_fast_bg.wasm')

if (existsSync(WASM_FILE)) {
  const wasmSize = getSize(WASM_FILE)
  const wasmDest = join(ASSETS_DIR, '_wasm/prisma-query-compiler.wasm')

  mkdirSync(join(ASSETS_DIR, '_wasm'), { recursive: true })
  copyFileSync(WASM_FILE, wasmDest)
  console.log(`\n✓ Copied WASM to assets/_wasm/ (${(wasmSize / 1024 / 1024).toFixed(2)} MiB)`)

  // Delete from server bundle
  rmSync(WASM_FILE, { force: true })
  bytesSaved += wasmSize
  console.log(`✓ Removed WASM from server bundle`)
}

// === Step 3: Patch wasm-worker-loader.mjs (if it still exists separately) ===
const WASM_LOADER = join(PRISMA_DIR, 'wasm-worker-loader.mjs')
if (existsSync(WASM_LOADER)) {
  writeFileSync(WASM_LOADER, `/* PiForum — Runtime WASM loader */
export default (async () => {
  const resp = await fetch("/_wasm/prisma-query-compiler.wasm");
  if (resp.ok) {
    const buffer = await resp.arrayBuffer();
    return await WebAssembly.compile(buffer);
  }
  throw new Error("Prisma WASM not found at /_wasm/prisma-query-compiler.wasm");
})()
`)
  console.log('✓ Patched wasm-worker-loader.mjs')
}

// === Step 4: Remove cloudflare-templates (build-time only) ===
const templateDir = join(OPEN_NEXT_DIR, 'cloudflare-templates')
if (existsSync(templateDir)) {
  const size = (() => { let t = 0; function w(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? w(p) : t += statSync(p).size } } try { w(templateDir) } catch {} return t })()
  rmSync(templateDir, { recursive: true, force: true })
  bytesSaved += size
  console.log(`\n✓ Removed cloudflare-templates/ (${(size / 1024).toFixed(1)} KiB)`)
}

// === Step 5: Patch worker.js to remove unused code ===
const workerJs = join(OPEN_NEXT_DIR, 'worker.js')
if (existsSync(workerJs)) {
  let code = readFileSync(workerJs, 'utf8')
  let modified = false

  // Remove image handling
  if (code.includes('handleCdnCgiImageRequest')) {
    code = code.replace(/\/\/@ts-expect-error:.*\nimport\s*\{[^}]*handleCdnCgiImageRequest[^}]*\}\s*from\s*["']\.\/cloudflare\/images\.js["'];?\n?/g, '')
    code = code.replace(/\/\/ Serve images in development\.[\s\S]*?return handleCdnCgiImageRequest\(url, env\);\s*\n\s*\}\s*\n?/g, '')
    code = code.replace(/\/\/ Fallback for the Next default image loader\.[\s\S]*?return await handleImageRequest\([^)]*\);\s*\n\s*\}\s*\n?/g, '')
    modified = true
  }

  // Remove skew protection (not used)
  if (code.includes('maybeGetSkewProtectionResponse')) {
    code = code.replace(/\/\/\s*@ts-expect-error.*\nimport\s*\{\s*maybeGetSkewProtectionResponse\s*\}\s*from\s*["']\.\/cloudflare\/skew-protection\.js["'];?\n?/g, '')
    code = code.replace(/const\s+response\s*=\s*maybeGetSkewProtectionResponse\s*\(\s*request\s*\)\s*;\s*\n\s*if\s*\(\s*response\s*\)\s*\{\s*\n\s*return\s+response\s*;\s*\n\s*\}\s*\n?/g, '')
    modified = true
  }

  if (modified) {
    writeFileSync(workerJs, code, 'utf8')
    console.log('\n✓ Patched worker.js (removed unused code)')
  }
}

// === Summary ===
console.log(`\n[postbuild-cf] Done. Saved ${(bytesSaved / 1024).toFixed(1)} KiB uncompressed from worker bundle.`)
