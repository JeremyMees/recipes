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

await import('~~/server/routes/auth/facebook.get')

const route = () => oauthHandlers.facebook!

beforeEach(() => {})

describe('GET /auth/facebook', () => {
  it('asks for the email scope and profile fields', () => {
    expect(route().config.scope).toEqual(['email'])
    expect(route().config.fields).toEqual(['id', 'name', 'email', 'picture'])
  })

  it('maps the facebook profile onto the shared login', async () => {
    const event = mockEvent()

    await route().onSuccess(event, {
      user: {
        id: 99,
        email: 'mama@example.test',
        name: 'Mama',
        picture: { data: { url: 'https://avatar.test/m.png' } },
      },
    } as never)

    expect(completeOAuthLogin).toHaveBeenCalledWith(event, {
      provider: 'facebook',
      providerAccountId: '99',
      email: 'mama@example.test',
      name: 'Mama',
      avatarUrl: 'https://avatar.test/m.png',
    })
  })

  it('tolerates a profile with no picture payload', async () => {
    await route().onSuccess(mockEvent(), {
      user: { id: 1, email: 'mama@example.test' },
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
