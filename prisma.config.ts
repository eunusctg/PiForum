import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  // Use the libsql adapter for local SQLite via DATABASE_URL.
  // Prisma 7 removed the native Rust engine — the adapter does the DB work.
  adapter: async () => {
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const url = process.env.DATABASE_URL || 'file:./db/custom.db'
    return new PrismaLibSQL({ url })
  },
})
