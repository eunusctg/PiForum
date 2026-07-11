# ============================================================
# PiForum — Edge-compatible Prisma Client for Cloudflare D1
# ============================================================
# This file is used ONLY when deploying to Cloudflare Pages.
# It swaps the file-based SQLite client for a D1-bound adapter.
#
# In your API routes, replace:
#   import { db } from '@/lib/db'
# with:
#   import { db } from '@/lib/db-edge'
#
# Or use a conditional import — see DEPLOY-CLOUDFLARE-PAGES.md
# ============================================================

import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

// Cloudflare Pages exposes bindings on `getRequestContext()` from
// `@cloudflare/next-on-pages`. We lazy-load it so the file still
// type-checks when running locally on Node.js.
let _db: PrismaClient | null = null

async function getDb(): Promise<PrismaClient> {
  if (_db) return _db

  // Dynamic import keeps Node.js dev mode working
  const { getRequestContext } = await import('@cloudflare/next-on-pages')
  const env = getRequestContext().env as { DB: D1Database }

  const adapter = new PrismaD1(env.DB)
  _db = new PrismaClient({ adapter })
  return _db
}

// Proxy that lazily resolves to the real Prisma client on first call.
// Usage stays identical: `await db.user.findMany()`
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return async (...args: unknown[]) => {
      const client = await getDb()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (client as any)[prop]
      if (typeof fn !== 'function') {
        throw new Error(`Prisma client property "${String(prop)}" is not callable on the edge.`)
      }
      return fn.apply(client, args)
    }
  },
})
