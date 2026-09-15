import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Logo from '~/components/logo.vue'

describe('Logo', () => {
  it('renders the logo as an svg', async () => {
    const component = await mountSuspended(Logo)

    const svg = component.find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBeTruthy()
  })

  it('renders the wordmark next to the mark', async () => {
    const component = await mountSuspended(Logo)

    expect(component.text()).toContain('Taco')
  })
})
