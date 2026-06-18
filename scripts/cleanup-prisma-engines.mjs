#!/usr/bin/env node
/**
 * PiForum — Prisma engine cleanup
 * ================================
 * Prisma 6.x generates WASM engines for ALL 5 databases (sqlite, mysql,
 * postgres, cockroachdb, sqlserver) in node_modules/@prisma/client/runtime/.
 * Each is ~3 MiB. We only use sqlite, so the other 4 engines (~12 MiB) bloat
 * the Cloudflare Worker bundle unnecessarily.
 *
 * Run this AFTER `prisma generate` and BEFORE `next build` to delete the
 * unused engines and the native Rust binary (we use the WASM engine via
 * PrismaD1 adapter on Workers).
 *
 * Usage:
 *   node scripts/cleanup-prisma-engines.mjs
 */
import { readdirSync, rmSync, existsSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RUNTIME_DIR = 'node_modules/@prisma/client/runtime'
const PRISMA_CLIENT_DIR = 'node_modules/.prisma/client'

const DBS_TO_DELETE = ['cockroachdb', 'mysql', 'postgresql', 'sqlserver']

let bytesFreed = 0

function deleteIf(path) {
  if (existsSync(path)) {
    const size = statSync(path).size
    rmSync(path, { force: true })
    bytesFreed += size
    console.log(`  deleted ${path} (${(size / 1024 / 1024).toFixed(2)} MiB)`)
  }
}

console.log('[cleanup-prisma-engines] Removing unused Prisma WASM engines...')

// 1. Delete unused database WASM engines in @prisma/client/runtime/
if (existsSync(RUNTIME_DIR)) {
  for (const db of DBS_TO_DELETE) {
    for (const ext of ['.js', '.mjs', '.wasm', '.wasm-base64.js', '.wasm-base64.mjs']) {
      deleteIf(join(RUNTIME_DIR, `query_engine_bg.${db}${ext}`))
      deleteIf(join(RUNTIME_DIR, `query_compiler_bg.${db}${ext}`))
      deleteIf(join(RUNTIME_DIR, `query_compiler_fast_bg.${db}${ext}`))
    }
  }
}

// 2. Delete native Rust engine binaries in .prisma/client/
//    (we use the WASM engine via the PrismaD1 adapter, not the Rust engine)
if (existsSync(PRISMA_CLIENT_DIR)) {
  for (const file of readdirSync(PRISMA_CLIENT_DIR)) {
    if (/^libquery_engine-/.test(file) || /^query_engine-/.test(file)) {
      deleteIf(join(PRISMA_CLIENT_DIR, file))
    }
  }
}

// 3. NOTE: Do NOT delete .prisma/client/query_compiler_fast_bg.wasm-base64.*
//    In Prisma 7.x, the generated index.js requires this file at runtime:
//      const { wasm } = require('./query_compiler_fast_bg.wasm-base64.js')
//    Deleting it breaks the esbuild bundle.

// 4. Replace .prisma/client/index.js with edge.js content.
//    The esbuild bundler picks index.js (regardless of workerd condition),
//    which requires the 4.5 MiB query_compiler_fast_bg.wasm-base64.js file.
//    edge.js uses @prisma/client/runtime/wasm-compiler-edge.js instead — no
//    base64 file needed. This saves ~4.5 MiB uncompressed / ~1 MiB compressed,
//    keeping the Worker under Cloudflare's 3 MiB free-plan limit.
const EDGE_JS = join(PRISMA_CLIENT_DIR, 'edge.js')
const INDEX_JS = join(PRISMA_CLIENT_DIR, 'index.js')
if (existsSync(EDGE_JS) && existsSync(INDEX_JS)) {
  const edgeSrc = readFileSync(EDGE_JS, 'utf8')
  const indexSrc = readFileSync(INDEX_JS, 'utf8')
  if (edgeSrc !== indexSrc) {
    const indexSize = indexSrc.length
    const edgeSize = edgeSrc.length
    writeFileSync(INDEX_JS, edgeSrc, 'utf8')
    bytesFreed += indexSize - edgeSize
    console.log(
      `  replaced ${INDEX_JS} with edge.js content (saved ${((indexSize - edgeSize) / 1024 / 1024).toFixed(2)} MiB)`,
    )
  }
}

// 5. Now safe to delete the 4.5 MiB base64 file (no longer referenced).
deleteIf(join(PRISMA_CLIENT_DIR, 'query_compiler_fast_bg.wasm-base64.js'))
deleteIf(join(PRISMA_CLIENT_DIR, 'query_compiler_fast_bg.wasm-base64.mjs'))

console.log(
  `[cleanup-prisma-engines] Done. Freed ${(bytesFreed / 1024 / 1024).toFixed(2)} MiB.`,
)
