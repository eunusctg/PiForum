import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  // Provide the database URL for prisma db push / migrate commands
  // (the adapter handles the runtime connection in the app itself)
  db: {
    url: process.env.DATABASE_URL || 'file:./db/custom.db',
  },
  adapter: async () => {
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const url = process.env.DATABASE_URL || 'file:./db/custom.db'
    return new PrismaLibSQL({ url })
  },
})
