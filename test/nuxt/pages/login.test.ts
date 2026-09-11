import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import LoginPage from '~/pages/login.vue'
import { testId } from '~~/test/unit/stubs/selectors'

const { useRouteMock } = vi.hoisted(() => ({ useRouteMock: vi.fn() }))

mockNuxtImport('useRoute', () => useRouteMock)

function mount(query: Record<string, string> = {}) {
  useRouteMock.mockReturnValue({ query })

  return mountSuspended(LoginPage)
}

describe('login page', () => {
  it('offers both social providers and nothing else', async () => {
    const component = await mount()

    expect(
      component.get(testId('auth-provider-google')).attributes('href'),
    ).toBe('/auth/google')
    expect(
      component.get(testId('auth-provider-facebook')).attributes('href'),
    ).toBe('/auth/facebook')
    expect(component.find('input').exists()).toBe(false)
  })

  it('shows no error banner by default', async () => {
    const component = await mount()

    expect(component.find(testId('login-error')).exists()).toBe(false)
  })

  it('explains a rejected email address', async () => {
    const component = await mount({ error: 'not_allowed' })

    expect(component.get(testId('login-error')).text()).toContain(
      'hoort niet bij de familie',
    )
  })

  it('explains a failed provider handshake', async () => {
    const component = await mount({ error: 'oauth_failed' })

    expect(component.get(testId('login-error')).text()).toContain(
      'Inloggen is mislukt',
    )
  })

  it('ignores an unknown error code', async () => {
    const component = await mount({ error: 'iets-anders' })

    expect(component.find(testId('login-error')).exists()).toBe(false)
  })
})
