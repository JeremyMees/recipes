import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppLogo from '~/components/AppLogo.vue'

describe('AppLogo', () => {
  it('renders the logo as an svg', async () => {
    const component = await mountSuspended(AppLogo)

    const svg = component.find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBe('0 0 1020 200')
  })
})
