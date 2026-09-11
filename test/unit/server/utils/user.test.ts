import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runtimeConfig, database } = await vi.hoisted(async () => {
  const { createDbStub } = await import('~~/test/unit/stubs/db')

  return {
    runtimeConfig: { databaseUrl: 'postgres://test/db' },
    database: createDbStub(),
  }
})

vi.mock('#app', () => ({
  useRuntimeConfig: () => runtimeConfig,
  createError: (input: { statusMessage: string }) =>
    new Error(input.statusMessage),
}))

vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}) }))
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: () => database.db }))

const { findUserByEmail, toSessionUser, upsertOAuthUser } =
  await import('~~/server/utils/user')

const existing = {
  id: 'u1',
  email: 'jeremy@example.test',
  name: 'Jeremy',
  avatarUrl: 'https://avatar.test/j.png',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const profile = {
  provider: 'google',
  providerAccountId: 'g-1',
  email: 'Jeremy@Example.test ',
  name: 'Jeremy',
  avatarUrl: null,
}

beforeEach(() => {
  database.reset()
})

describe('findUserByEmail', () => {
  it('returns the user', async () => {
    database.results.push([existing])

    await expect(findUserByEmail('jeremy@example.test')).resolves.toBe(existing)
  })

  it('normalises the address before looking it up', async () => {
    database.results.push([existing])

    await findUserByEmail('  Jeremy@Example.TEST ')

    expect(database.called('where')).toBeDefined()
  })

  it('returns undefined when there is no such user', async () => {
    database.results.push([])

    await expect(
      findUserByEmail('nobody@example.test'),
    ).resolves.toBeUndefined()
  })
})

describe('upsertOAuthUser', () => {
  it('returns the already linked user without touching anything else', async () => {
    database.results.push([{ user: existing }])

    await expect(upsertOAuthUser(profile)).resolves.toBe(existing)
    expect(database.called('insert')).toBeUndefined()
  })

  it('links an existing account matched by email', async () => {
    database.results.push([], [existing], [])

    await expect(upsertOAuthUser(profile)).resolves.toBe(existing)
    expect(database.called('insert')).toBeDefined()
    expect(database.called('onConflictDoNothing')).toBeDefined()
  })

  it('creates the user when the email is new', async () => {
    const created = { ...existing, id: 'u2' }

    database.results.push([], [], [created], [])

    await expect(upsertOAuthUser(profile)).resolves.toBe(created)
  })
})

describe('toSessionUser', () => {
  it('exposes only what the session needs', () => {
    expect(toSessionUser(existing)).toEqual({
      id: 'u1',
      email: 'jeremy@example.test',
      name: 'Jeremy',
      avatarUrl: 'https://avatar.test/j.png',
    })
  })

  it('does not leak the created date', () => {
    expect(toSessionUser(existing)).not.toHaveProperty('createdAt')
  })
})
