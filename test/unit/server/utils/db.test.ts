import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runtimeConfig, neonCalls, drizzleCalls } = vi.hoisted(() => ({
  runtimeConfig: { databaseUrl: '' },
  neonCalls: [] as string[],
  drizzleCalls: [] as Record<string, unknown>[],
}))

vi.mock('#app', () => ({
  useRuntimeConfig: () => runtimeConfig,
  createError: (input: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
}))

vi.mock('@neondatabase/serverless', () => ({
  neon: (url: string) => {
    neonCalls.push(url)

    return { url }
  },
}))

vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: (client: unknown, options: Record<string, unknown>) => {
    drizzleCalls.push({ client, ...options })

    return { db: drizzleCalls.length }
  },
}))

async function loadDb() {
  vi.resetModules()

  return import('~~/server/utils/db')
}

beforeEach(() => {
  runtimeConfig.databaseUrl = 'postgres://runtime/db'
  neonCalls.length = 0
  drizzleCalls.length = 0
  delete process.env.DATABASE_URL
})

describe('useDb', () => {
  it('connects with the runtime config url', async () => {
    const { useDb } = await loadDb()

    useDb()

    expect(neonCalls).toEqual(['postgres://runtime/db'])
  })

  it('falls back to the environment when runtime config is empty', async () => {
    runtimeConfig.databaseUrl = ''
    process.env.DATABASE_URL = 'postgres://env/db'

    const { useDb } = await loadDb()

    useDb()

    expect(neonCalls).toEqual(['postgres://env/db'])
  })

  it('uses snake_case so the schema matches the migrations', async () => {
    const { useDb } = await loadDb()

    useDb()

    expect(drizzleCalls[0]).toMatchObject({ casing: 'snake_case' })
  })

  it('passes the schema through', async () => {
    const { useDb, schema } = await loadDb()

    useDb()

    expect(drizzleCalls[0]!.schema).toBe(schema)
  })

  it('connects once and reuses the connection', async () => {
    const { useDb } = await loadDb()

    const first = useDb()
    const second = useDb()

    expect(first).toBe(second)
    expect(neonCalls).toHaveLength(1)
  })

  it('fails loudly when no database url is configured', async () => {
    runtimeConfig.databaseUrl = ''

    const { useDb } = await loadDb()

    expect(() => useDb()).toThrow('DATABASE_URL is not configured')
    expect(neonCalls).toHaveLength(0)
  })
})
