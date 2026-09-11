import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import App from '~/app.vue'

const { navigateToMock, clearMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  clearMock: vi.fn(),
}))

const sessionState = {
  loggedIn: ref(true),
  user: ref<Record<string, unknown> | null>(null),
}

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: sessionState.loggedIn,
  user: sessionState.user,
  clear: clearMock,
}))

beforeEach(() => {
  sessionState.loggedIn.value = true
  sessionState.user.value = {
    id: 'u1',
    email: 'jeremy@example.test',
    name: 'Jeremy',
    avatarUrl: null,
  }
})

function mount() {
  return mountSuspended(App, {
    global: { stubs: { NuxtPage: { template: '<div>page</div>' } } },
  })
}

describe('app shell', () => {
  it('always shows the logo linking home', async () => {
    const component = await mount()

    expect(component.find('a[href="/"]').exists()).toBe(true)
  })

  it('shows the navigation when signed in', async () => {
    const component = await mount()

    expect(component.text()).toContain('Mijn recepten')
    expect(component.text()).toContain('Familie')
  })

  it('hides the navigation when signed out', async () => {
    sessionState.loggedIn.value = false

    const component = await mount()

    expect(component.text()).not.toContain('Mijn recepten')
  })

  it('renders the routed page', async () => {
    const component = await mount()

    expect(component.text()).toContain('page')
  })
})
