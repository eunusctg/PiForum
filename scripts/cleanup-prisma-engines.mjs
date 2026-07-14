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
//    Deleting it breaks both local dev and the esbuild bundle.
//
//    The replacement of index.js with edge.js and deletion of the base64 file
//    is now done ONLY in the Cloudflare post-build script (postbuild-cf.mjs),
//    because the edge client doesn't work in Node.js (local dev).

// 4. (Moved to postbuild-cf.mjs) Replace .prisma/client/index.js with edge.js
//     content and delete the 4.5 MiB base64 file. This is only safe inside the
//     .open-next bundle where esbuild resolves all imports statically.

console.log(
  `[cleanup-prisma-engines] Done. Freed ${(bytesFreed / 1024 / 1024).toFixed(2)} MiB.`,
)
