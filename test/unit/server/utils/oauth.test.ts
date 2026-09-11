import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { redirects } from '~~/test/unit/stubs/h3'
import { resetSession, session } from '~~/test/unit/stubs/auth'

const { runtimeConfig, database } = await vi.hoisted(async () => {
  const { createDbStub } = await import('~~/test/unit/stubs/db')

  return {
    runtimeConfig: {
      databaseUrl: 'postgres://test/db',
      familyEmails: 'jeremy@example.test,mama@example.test',
    },
    database: createDbStub(),
  }
})

vi.mock('#app', () => ({
  useRuntimeConfig: () => runtimeConfig,
  createError: (input: { statusMessage: string }) =>
    new Error(input.statusMessage),
}))

vi.mock('h3', async importOriginal => {
  const actual = await importOriginal<typeof import('h3')>()
  const { redirects: captured } = await import('~~/test/unit/stubs/h3')

  return {
    ...actual,
    sendRedirect: async (_event: unknown, location: string) => {
      captured.push(location)

      return location
    },
  }
})

vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}) }))
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: () => database.db }))

const { completeOAuthLogin, failOAuthLogin } =
  await import('~~/server/utils/oauth')

const user = {
  id: 'u1',
  email: 'jeremy@example.test',
  name: 'Jeremy',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

function profile(email: string) {
  return {
    provider: 'google',
    providerAccountId: 'g-1',
    email,
    name: 'Jeremy',
    avatarUrl: null,
  }
}

beforeEach(() => {
  database.reset()
  redirects.length = 0
  resetSession()
})

describe('completeOAuthLogin', () => {
  it('signs in a family member and lands them on the home page', async () => {
    database.results.push([{ user }])

    await completeOAuthLogin(mockEvent(), profile('jeremy@example.test'))

    expect(redirects).toEqual(['/'])
    expect(session.user).toMatchObject({
      id: 'u1',
      email: 'jeremy@example.test',
    })
  })

  it('records when the session was created', async () => {
    database.results.push([{ user }])

    await completeOAuthLogin(mockEvent(), profile('jeremy@example.test'))

    expect(session.set[0]!.loggedInAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    )
  })

  it('turns away an address that is not on the allowlist', async () => {
    await completeOAuthLogin(mockEvent(), profile('stranger@example.test'))

    expect(redirects).toEqual(['/login?error=not_allowed'])
    expect(session.user).toBeUndefined()
  })

  it('does not touch the database for a rejected address', async () => {
    await completeOAuthLogin(mockEvent(), profile('stranger@example.test'))

    expect(database.calls).toHaveLength(0)
  })
})

describe('failOAuthLogin', () => {
  it('sends the user back to login with an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await failOAuthLogin(mockEvent(), new Error('provider exploded'))

    expect(redirects).toEqual(['/login?error=oauth_failed'])
  })

  it('logs the underlying failure', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('provider exploded')

    await failOAuthLogin(mockEvent(), error)

    expect(logged).toHaveBeenCalledWith('OAuth login failed', error)
  })
})
