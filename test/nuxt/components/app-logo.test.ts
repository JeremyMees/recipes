import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppLogo from '~/components/app-logo.vue'

describe('AppLogo', () => {
  it('renders the logo as an svg', async () => {
    const component = await mountSuspended(AppLogo)

    const svg = component.find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBe('0 0 128 128')
  })

  it('renders the wordmark next to the mark', async () => {
    const component = await mountSuspended(AppLogo)

    expect(component.text()).toContain('Wrap')
  })
})
