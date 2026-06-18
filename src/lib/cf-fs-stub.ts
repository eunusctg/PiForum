/**
 * PiForum — Cloudflare Workers Node.js fs shim
 * =============================================
 * Prisma 6.x's runtime calls `fs.readdir` to detect OpenSSL/libssl on Linux
 * for the Rust query engine loader. On Cloudflare Workers (unenv), fs.readdir
 * is not implemented and throws "[unenv] fs.readdir is not implemented yet!".
 *
 * Since we use a driver adapter (PrismaD1) and don't need the Rust engine,
 * we stub fs.readdir to return an empty array. Prisma's platform detection
 * then skips OpenSSL detection and continues normally.
 *
 * Import this file at the very top of `src/lib/db.ts` (before Prisma loads).
 *
 * The install is lazy: it only runs when `installFsStub()` is called at
 * runtime (inside a request handler), not at module load — so it doesn't
 * break Turbopack's static page-data collection phase.
 */

declare global {
  // eslint-disable-next-line no-var
  var __piforumFsStubInstalled: boolean | undefined
}

export function installFsStub(): void {
  if (globalThis.__piforumFsStubInstalled) return
  globalThis.__piforumFsStubInstalled = true

  // Only stub in the Workers runtime — leave Node.js dev mode alone.
  const isWorkers =
    typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair ===
      'function' ||
    typeof (globalThis as { MINIFLARE?: unknown }).MINIFLARE !== 'undefined'
  if (!isWorkers) return

  try {
    // Use a dynamic property access so Turbopack doesn't try to bundle 'fs'
    // at build time. The require is only evaluated at runtime in Workers.
    const modulePath = 'f' + 's'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = (require as unknown as (m: string) => any)(modulePath)
    if (!fs || typeof fs !== 'object') return

    // readdir (async callback form) — return empty array
    if (typeof fs.readdir === 'function') {
      fs.readdir = (
        _path: string,
        cb: (err: null, files: string[]) => void,
      ) => {
        // Prisma scans /lib, /usr/lib etc. for libssl.so.* — return [] on
        // Workers (no filesystem). Call back async to mimic fs.readdir.
        setTimeout(() => cb(null, []), 0)
      }
    }

    // readdirSync — return empty array
    if (typeof fs.readdirSync === 'function') {
      fs.readdirSync = () => []
    }

    // existsSync — return false (no files exist on Workers fs)
    if (typeof fs.existsSync === 'function') {
      fs.existsSync = () => false
    }

    // readFileSync — return empty buffer/string
    if (typeof fs.readFileSync === 'function') {
      const origReadFileSync = fs.readFileSync
      fs.readFileSync = (path: string, encoding?: string) =>
        encoding ? '' : Buffer.alloc(0)
      void origReadFileSync
    }

    // statSync — return a stub stat object
    if (typeof fs.statSync === 'function') {
      fs.statSync = () => ({
        isFile: () => false,
        isDirectory: () => false,
      })
    }
  } catch {
    // fs module not available — nothing to stub
  }
}
