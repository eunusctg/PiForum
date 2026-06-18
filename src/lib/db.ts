/**
 * PiForum — Unified Prisma Client (Cloudflare Workers + Local Dev)
 * =================================================================
 *
 * Production (Cloudflare Workers via OpenNext):
 *   Dynamic-imports `@prisma/client/edge` (WASM query engine, no fs.readdir)
 *   and wraps the `DB` D1 binding with `@prisma/adapter-d1`'s `PrismaD1`.
 *
 * Local dev (`bun run dev`):
 *   Dynamic-imports `@prisma/client` (native Node.js engine) and opens the
 *   local SQLite file via DATABASE_URL.
 *
 * `db` is a recursive Proxy that bridges sync→async transparently so call
 * sites stay unchanged:
 *
 *     import { db } from '@/lib/db'
 *     await db.user.findMany()
 *     await db.$transaction([...])
 */

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
  if (isWorkersRuntime()) {
    try {
      const [{ getCloudflareContext }, { PrismaD1 }, edgeMod] =
        await Promise.all([
          import('@opennextjs/cloudflare'),
          import('@prisma/adapter-d1'),
          import('@prisma/client/edge'),
        ])
      const ctx = (await getCloudflareContext({ async: true })) as {
        env: CloudflareEnv
      }
      const d1 = ctx?.env?.DB
      if (d1) {
        const EdgePrismaClient = (
          edgeMod as { PrismaClient: typeof PrismaClient }
        ).PrismaClient
        return new EdgePrismaClient({ adapter: new PrismaD1(d1) })
      }
    } catch (err) {
      console.error('[db] Workers Prisma init failed:', err)
      throw err
    }
  }

  // Local Node.js dev path
  const nodeMod = await import('@prisma/client')
  const NodePrismaClient = (
    nodeMod as { PrismaClient: typeof PrismaClient }
  ).PrismaClient
  return new NodePrismaClient({
    log:
      process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  })
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
