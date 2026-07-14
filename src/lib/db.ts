/**
 * PiForum — Unified Prisma Client (Cloudflare Workers + Local Dev)
 * =================================================================
 *
 * Production (Cloudflare Workers via OpenNext):
 *   Uses `@prisma/adapter-d1` with the `DB` D1 binding for database access.
 *
 * Local dev (`bun run dev` / `npx next dev`):
 *   Uses `@prisma/adapter-libsql` with the local SQLite file.
 *
 * `db` is a recursive Proxy that bridges sync→async transparently so call
 * sites stay unchanged:
 *
 *     import { db } from '@/lib/db'
 *     await db.user.findMany()
 *     await db.$transaction([...])
 */

// IMPORTANT: install the fs stub before Prisma loads. Prisma 6.x's runtime
// calls fs.readdir to detect OpenSSL on Linux; on Cloudflare Workers (unenv)
// this throws "[unenv] fs.readdir is not implemented yet!". The stub returns
// [] so Prisma's platform detection skips OpenSSL and continues with the
// driver adapter path. The install runs lazily inside buildClient() so it
// doesn't break Turbopack's static page-data collection.
import { installFsStub } from './cf-fs-stub'

import type { PrismaClient } from '@prisma/client'

type CloudflareEnv = {
  DB?: D1Database
  UPLOADS?: R2Bucket
  SESSIONS?: KVNamespace
  [key: string]: unknown
}

let _clientPromise: Promise<PrismaClient> | null = null

function isWorkersRuntime(): boolean {
  // Cloudflare Workers / workerd exposes WebSocketPair and caches on globalThis
  return (
    typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair ===
      'function' ||
    // Miniflare marker
    typeof (globalThis as { MINIFLARE?: unknown }).MINIFLARE !== 'undefined'
  )
}

async function buildClient(): Promise<PrismaClient> {
  // Install the fs stub FIRST, before Prisma loads, so fs.readdir returns []
  // instead of throwing on Cloudflare Workers.
  installFsStub()

  if (isWorkersRuntime()) {
    try {
      // On Cloudflare Workers, use the edge-compatible Prisma client entry.
      // The default `@prisma/client` entry loads the WASM query compiler
      // which adds 3.4 MB to the bundle and causes runtime errors on the
      // free plan (3 MiB limit). The edge entry + D1 adapter bypasses WASM.
      const [{ PrismaClient: BasePrismaClient }, { getCloudflareContext }, { PrismaD1 }] = await Promise.all([
        import('@prisma/client/edge'),
        import('@opennextjs/cloudflare'),
        import('@prisma/adapter-d1'),
      ])
      const ctx = (await getCloudflareContext({ async: true })) as {
        env: CloudflareEnv
      }
      const d1 = ctx?.env?.DB
      if (d1) {
        return new BasePrismaClient({ adapter: new PrismaD1(d1) })
      }
    } catch (err) {
      console.error('[db] Workers Prisma init failed:', err)
      throw err
    }
  }

  // Local Node.js dev path — Prisma 7 removed the native Rust engine, so we
  // must provide a driver adapter. Use the libsql adapter against the local
  // SQLite file (DATABASE_URL=file:.../custom.db).
  const { PrismaClient: BasePrismaClient } = await import('@prisma/client')
  try {
    const { PrismaLibSql } = await import('@prisma/adapter-libsql')
    const url =
      process.env.DATABASE_URL || 'file:./db/custom.db'
    return new BasePrismaClient({
      adapter: new PrismaLibSql({ url }) as never,
      log:
        process.env.NODE_ENV !== 'production'
          ? ['error', 'warn']
          : ['error'],
    })
  } catch (err) {
    console.error('[db] Local Prisma init failed:', err)
    throw err
  }
}

function getClient(): Promise<PrismaClient> {
  if (!_clientPromise) {
    _clientPromise = buildClient().catch((err) => {
      // Reset so the next call can retry
      _clientPromise = null
      throw err
    })
  }
  return _clientPromise
}

/**
 * Recursive Proxy that turns `db.x.y.z(args)` into a Promise that resolves
 * once the underlying client is ready, then calls through to it. This lets
 * call sites stay exactly the same as a sync PrismaClient:
 *
 *     await db.user.findMany()                       // ✅ works
 *     await db.$transaction([db.user.deleteMany()])  // ⚠️  see note
 *
 * Note: `db.$transaction([...])` with an ARRAY of operations requires the
 * operations to be Prisma promises (not our proxy promises). For
 * transactions, use the callback form: `await db.$transaction(async (tx) => { ... })`.
 */
function makeAsyncProxy<T>(promise: Promise<unknown>): T {
  const proxy = new Proxy(function () {} as unknown as T, {
    get(_target, prop) {
      // Special-case Symbol.toPrimitive etc. so the proxy is inspectable.
      if (typeof prop === 'symbol') {
        return undefined
      }
      return makeAsyncProxy(promise.then((t) => (t as Record<string, unknown>)[prop]))
    },
    apply(_target, _thisArg, args) {
      return promise.then((fn) => {
        if (typeof fn !== 'function') {
          throw new Error(
            `[db] attempted to call a non-function: ${String(fn)}`,
          )
        }
        return (fn as (...a: unknown[]) => unknown)(...args)
      })
    },
  })
  return proxy
}

/**
 * The PrismaClient. Lazily initialises on first property access.
 */
export const db = makeAsyncProxy<PrismaClient>(getClient())

/** Explicit async getter (useful for explicit init or testing). */
export function getDbAsync(): Promise<PrismaClient> {
  return getClient()
}

/** Reset the cached client (mainly for HMR / tests). */
export async function resetDb(): Promise<void> {
  if (_clientPromise) {
    try {
      const client = await _clientPromise
      await client.$disconnect()
    } catch {
      /* ignore */
    }
    _clientPromise = null
  }
}
