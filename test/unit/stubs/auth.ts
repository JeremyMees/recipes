import { vi } from 'vitest'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export const session: {
  user: SessionUser | undefined
  set: { user: SessionUser; loggedInAt: string }[]
  cleared: number
} = {
  user: undefined,
  set: [],
  cleared: 0,
}

export function resetSession(user?: Partial<SessionUser>) {
  session.user = user
    ? {
        id: 'u1',
        email: 'jeremy@example.test',
        name: 'Jeremy',
        avatarUrl: null,
        ...user,
      }
    : undefined
  session.set.length = 0
  session.cleared = 0
}

export const requireUserSession = vi.fn(async () => {
  if (!session.user) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
  }

  return { user: session.user }
})

export const getUserSession = vi.fn(async () => ({ user: session.user }))

export const setUserSession = vi.fn(
  async (_event: unknown, data: { user: SessionUser; loggedInAt: string }) => {
    session.user = data.user
    session.set.push(data)

    return data
  },
)

export const clearUserSession = vi.fn(async () => {
  session.user = undefined
  session.cleared += 1
})

export interface OAuthHandlerConfig {
  config: Record<string, unknown>
  onSuccess: (
    event: unknown,
    payload: { user: Record<string, never> },
  ) => unknown
  onError: (event: unknown, error: unknown) => unknown
}

export const oauthHandlers: Record<string, OAuthHandlerConfig> = {}

export const defineOAuthGoogleEventHandler = vi.fn(
  (options: OAuthHandlerConfig) => {
    oauthHandlers.google = options

    return options
  },
)

export const defineOAuthFacebookEventHandler = vi.fn(
  (options: OAuthHandlerConfig) => {
    oauthHandlers.facebook = options

    return options
  },
)
