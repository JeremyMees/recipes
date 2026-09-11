import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../database/schema'

type Database = ReturnType<typeof createDatabase>

function createDatabase() {
  const databaseUrl = useRuntimeConfig().databaseUrl || process.env.DATABASE_URL

  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'DATABASE_URL is not configured',
    })
  }

  return drizzle(neon(databaseUrl), { schema, casing: 'snake_case' })
}

let database: Database | undefined

export function useDb(): Database {
  database ??= createDatabase()

  return database
}

export { schema }
