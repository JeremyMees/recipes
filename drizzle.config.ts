import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
})
