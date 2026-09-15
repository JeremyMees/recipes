import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { reactive, ref } from 'vue'
import type { DOMWrapper } from '@vue/test-utils'
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue'
import App from '~/app.vue'
import ThemeToggle from '~/components/theme-toggle.vue'

const { navigateToMock, clearMock, revealMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  clearMock: vi.fn(),
  revealMock: vi.fn<
    (update: () => void, anchor?: HTMLElement | null) => Promise<void>
  >(async update => {
    update()
  }),
}))

const sessionState = {
  loggedIn: ref(true),
  user: ref<Record<string, unknown> | null>(null),
}

const colorMode = reactive({ value: 'light', preference: 'light' })

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: sessionState.loggedIn,
  user: sessionState.user,
  clear: clearMock,
}))
mockNuxtImport('useColorMode', () => () => colorMode)
mockNuxtImport('revealTransition', () => revealMock)

beforeEach(() => {
  sessionState.loggedIn.value = true
  sessionState.user.value = {
    id: 'u1',
    email: 'jeremy@example.test',
    name: 'Jeremy',
    avatarUrl: null,
  }
  colorMode.value = 'light'
  colorMode.preference = 'light'
  revealMock.mockClear()
})

interface MenuItem {
  label: string
  icon?: string
  onSelect?: (event: Event) => void
}

interface ProfileMenu {
  props(name: 'items'): MenuItem[][]
  find(selector: string): DOMWrapper<Element>
}

type Shell = Awaited<ReturnType<typeof mount>>

function profileMenu(component: Shell) {
  return component.findComponent(UDropdownMenu) as unknown as ProfileMenu
}

function themeItem(component: Shell) {
  return profileMenu(component)
    .props('items')
    .flat()
    .find(item => item.label.endsWith('thema'))
}

function selectTheme(component: Shell) {
  const event = new Event('select', { cancelable: true })

  themeItem(component)?.onSelect?.(event)

  return event
}

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

describe('theme switching', () => {
  it('offers the dark theme from the profile menu when light', async () => {
    const component = await mount()

    expect(themeItem(component)).toMatchObject({
      label: 'Donker thema',
      icon: 'i-ri-moon-line',
    })
  })

  it('offers the light theme from the profile menu when dark', async () => {
    colorMode.value = 'dark'

    const component = await mount()

    expect(themeItem(component)).toMatchObject({
      label: 'Licht thema',
      icon: 'i-ri-sun-line',
    })
  })

  it('switches the theme without closing the profile menu', async () => {
    const component = await mount()

    const event = selectTheme(component)

    expect(event.defaultPrevented).toBe(true)
    expect(colorMode.preference).toBe('dark')
  })

  it('anchors the reveal on the profile menu trigger', async () => {
    const component = await mount()

    selectTheme(component)

    expect(revealMock).toHaveBeenCalledOnce()
    expect(revealMock.mock.calls[0]?.[1]).toBe(
      profileMenu(component).find('button').element,
    )
  })

  it('falls back to a standalone toggle when signed out', async () => {
    sessionState.loggedIn.value = false

    const component = await mount()

    expect(component.findComponent(ThemeToggle).exists()).toBe(true)
  })

  it('hides the standalone toggle when signed in', async () => {
    const component = await mount()

    expect(component.findComponent(ThemeToggle).exists()).toBe(false)
  })
})
