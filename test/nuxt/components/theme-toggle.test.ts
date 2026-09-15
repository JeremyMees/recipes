import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { reactive } from 'vue'
import ThemeToggle from '~/components/theme-toggle.vue'

const { revealMock } = vi.hoisted(() => ({
  revealMock: vi.fn<
    (update: () => void, anchor?: HTMLElement | null) => Promise<void>
  >(async update => {
    update()
  }),
}))

const colorMode = reactive({ value: 'light', preference: 'light' })

mockNuxtImport('useColorMode', () => () => colorMode)
mockNuxtImport('revealTransition', () => revealMock)

beforeEach(() => {
  colorMode.value = 'light'
  colorMode.preference = 'light'
  revealMock.mockClear()
})

async function clickToggle() {
  const component = await mountSuspended(ThemeToggle)
  const button = component.find('button')

  await button.trigger('click')

  return { component, button }
}

describe('ThemeToggle', () => {
  it('switches to dark from light', async () => {
    await clickToggle()

    expect(colorMode.preference).toBe('dark')
  })

  it('switches to light from dark', async () => {
    colorMode.value = 'dark'
    colorMode.preference = 'dark'

    await clickToggle()

    expect(colorMode.preference).toBe('light')
  })

  it('anchors the reveal on the button', async () => {
    const { button } = await clickToggle()

    expect(revealMock).toHaveBeenCalledOnce()
    expect(revealMock.mock.calls[0]?.[1]).toBe(button.element)
  })

  it('labels the button for assistive tech', async () => {
    const component = await mountSuspended(ThemeToggle)

    expect(component.find('button').attributes('aria-label')).toBe(
      'Thema wisselen',
    )
  })
})
