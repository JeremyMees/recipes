import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { oauthHandlers } from '~~/test/unit/stubs/auth'

const { completeOAuthLogin, failOAuthLogin } = vi.hoisted(() => ({
  completeOAuthLogin: vi.fn(),
  failOAuthLogin: vi.fn(),
}))

vi.mock('~~/server/utils/oauth', () => ({
  completeOAuthLogin,
  failOAuthLogin,
}))

await import('~~/server/routes/auth/google.get')

const route = () => oauthHandlers.google!

beforeEach(() => {})

describe('GET /auth/google', () => {
  it('asks for the scopes the app needs', () => {
    expect(route().config.scope).toEqual(['openid', 'email', 'profile'])
  })

  it('maps the google profile onto the shared login', async () => {
    const event = mockEvent()

    await route().onSuccess(event, {
      user: {
        sub: 12345,
        email: 'jeremy@example.test',
        name: 'Jeremy',
        picture: 'https://avatar.test/j.png',
      },
    } as never)

    expect(completeOAuthLogin).toHaveBeenCalledWith(event, {
      provider: 'google',
      providerAccountId: '12345',
      email: 'jeremy@example.test',
      name: 'Jeremy',
      avatarUrl: 'https://avatar.test/j.png',
    })
  })

  it('tolerates a profile with no name or picture', async () => {
    await route().onSuccess(mockEvent(), {
      user: { sub: 'abc', email: 'jeremy@example.test' },
    } as never)

    expect(completeOAuthLogin.mock.calls[0]![1]).toMatchObject({
      name: null,
      avatarUrl: null,
    })
  })

  it('hands failures to the shared error path', () => {
    expect(route().onError).toBe(failOAuthLogin)
  })
})
