/**
 * PiForum — Unified Prisma Client (Cloudflare Workers + Local Dev)
 * =================================================================
 *
 * Production (Cloudflare Workers via OpenNext):
 *   Uses `getCloudflareContext()` from `@opennextjs/cloudflare` to grab the
 *   `DB` D1 binding, wraps it with `@prisma/adapter-d1`'s `PrismaD1` adapter.
 *   No filesystem access required.
 *
 * Local dev (`bun run dev`):
 *   `initOpenNextCloudflareForDev()` is called in next.config.mjs, which
 *   makes `getCloudflareContext()` work locally too (via wrangler's
 *   `getPlatformProxy`). Falls back to a plain `PrismaClient()` opening
 *   the local SQLite file if the Cloudflare context is unavailable.
 *
 * The export is a Proxy that lazily initialises the client on first property
 * access inside a request. Call sites stay unchanged:
 *
 *     import { db } from '@/lib/db'
 *     await db.user.findMany()
 *     await db.$transaction([...])
 */

import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

type CloudflareEnv = {
  DB?: D1Database
  UPLOADS?: R2Bucket
  SESSIONS?: KVNamespace
  [key: string]: unknown
}

let _db: PrismaClient | null = null

function buildWorkerClient(): PrismaClient {
  const ctx = getCloudflareContext() as { env: CloudflareEnv } | undefined
  const d1 = ctx?.env?.DB
  if (!d1) {
    throw new Error(
      'Cloudflare D1 binding "DB" is not attached to this Worker. ' +
        'Check wrangler.toml → [[d1_databases]] → binding = "DB".',
    )
  }
  return new PrismaClient({ adapter: new PrismaD1(d1) })
}

function buildLocalClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  })
}

/**
 * Returns the cached PrismaClient, initialising it on first call.
 *
 * Tries the Cloudflare Workers path first. If `getCloudflareContext()` is
 * unavailable (e.g. running outside a request context, or local dev without
 * `initOpenNextCloudflareForDev`), falls back to a plain PrismaClient that
 * opens the local SQLite file via DATABASE_URL.
 */
function getDb(): PrismaClient {
  if (_db) return _db
  try {
    _db = buildWorkerClient()
  } catch {
    _db = buildLocalClient()
  }
  return _db
}

/**
 * Proxy that mirrors the PrismaClient surface so call sites stay unchanged.
 * The client is lazily constructed on first property access inside a request.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    return (client as Record<PropertyKey, unknown>)[prop as PropertyKey]
  },
}) as PrismaClient

/** Explicit async getter (useful for explicit init or reset). */
export function getDbAsync(): PrismaClient {
  return getDb()
}

/** Reset the cached client (mainly for HMR / tests). */
export async function resetDb(): Promise<void> {
  if (_db) {
    try {
      await _db.$disconnect()
    } catch {
      /* ignore */
    }
    _db = null
  }
}
