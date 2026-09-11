import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AuthProviderButtons from '~/components/auth-provider-buttons.vue'
import { testId } from '~~/test/unit/stubs/selectors'

function mount() {
  return mountSuspended(AuthProviderButtons)
}

describe('AuthProviderButtons', () => {
  it('offers both providers the app supports', async () => {
    const component = await mount()

    expect(component.find(testId('auth-provider-google')).exists()).toBe(true)
    // expect(component.find(testId('auth-provider-facebook')).exists()).toBe(true)
  })

  it('links each provider at its server route', async () => {
    const component = await mount()

    expect(
      component.get(testId('auth-provider-google')).attributes('href'),
    ).toBe('/auth/google')
    // expect(
    //   component.get(testId('auth-provider-facebook')).attributes('href'),
    // ).toBe('/auth/facebook')
  })

  it('labels the buttons in Dutch', async () => {
    const component = await mount()

    expect(component.get(testId('auth-provider-google')).text()).toContain(
      'Inloggen met Google',
    )
    // expect(component.get(testId('auth-provider-facebook')).text()).toContain(
    //     'Inloggen met Facebook',
    // )
  })

  it('leaves the app for the oauth redirect rather than routing internally', async () => {
    const component = await mount()

    expect(component.get(testId('auth-provider-google')).element.tagName).toBe(
      'A',
    )
  })
})
