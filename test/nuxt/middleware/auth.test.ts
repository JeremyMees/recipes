import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteLocationNormalized } from 'vue-router'
import authGlobal from '~/middleware/auth.global'

const { useUserSessionMock, navigateToMock } = vi.hoisted(() => ({
  useUserSessionMock: vi.fn(),
  navigateToMock: vi.fn((path: string) => path),
}))

mockNuxtImport('useUserSession', () => useUserSessionMock)
mockNuxtImport('navigateTo', () => navigateToMock)

function route(path: string) {
  return { path } as unknown as RouteLocationNormalized
}

function run(path: string) {
  return authGlobal(route(path), route('/'))
}

function setLoggedIn(loggedIn: boolean) {
  useUserSessionMock.mockReturnValue({ loggedIn: ref(loggedIn) })
}

describe('auth.global middleware', () => {
  beforeEach(() => {
    navigateToMock.mockClear()
  })

  it('sends a signed out visitor to the login page', () => {
    setLoggedIn(false)

    run('/')

    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })

  it('guards nested recipe routes too', () => {
    setLoggedIn(false)

    run('/recipes/r1/edit')

    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })

  it('lets a signed out visitor reach the login page', () => {
    setLoggedIn(false)

    expect(run('/login')).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('bounces a signed in user away from the login page', () => {
    setLoggedIn(true)

    run('/login')

    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('leaves a signed in user alone on protected routes', () => {
    setLoggedIn(true)

    expect(run('/family')).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
