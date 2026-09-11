import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { readBody } from 'h3'
import RecipeEditPage from '~/pages/recipes/[id]/edit.vue'
import { RECIPE_IMAGE_KEY, detail } from '~~/test/fixtures/recipes'
import { testId } from '~~/test/unit/stubs/selectors'
import type { RecipeDetail } from '#shared/types/recipe'

const { navigateToMock, useRouteMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  useRouteMock: vi.fn(() => ({ params: { id: 'r1' } })),
}))

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => useRouteMock)

let response: RecipeDetail
let patched: unknown[]

registerEndpoint('/api/recipes/r1', {
  method: 'GET',
  handler: () => response,
})

registerEndpoint('/api/recipes/r1', {
  method: 'PATCH',
  handler: async event => {
    patched.push(await readBody(event))

    return { id: 'r1' }
  },
})

beforeEach(() => {
  response = detail()
  patched = []
  navigateToMock.mockReset()
})

function mountPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  return mountSuspended(RecipeEditPage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

async function mountLoaded() {
  const component = await mountPage()

  await vi.waitFor(() =>
    expect(component.find(testId('recipe-form')).exists()).toBe(true),
  )

  return component
}

describe('recipe edit page', () => {
  it('prefills the form with the saved recipe', async () => {
    const component = await mountLoaded()

    expect(
      (component.get(testId('recipe-form-title')).element as HTMLInputElement)
        .value,
    ).toBe('Spaghetti bolognese')
  })

  it('shows the current image so it can be replaced', async () => {
    response = detail({
      imageKey: RECIPE_IMAGE_KEY,
      imageUrl: 'https://bucket.test/a.webp',
    })

    const component = await mountLoaded()

    expect(component.get(testId('recipe-form-image')).attributes('src')).toBe(
      'https://bucket.test/a.webp',
    )
  })

  it('saves the changes', async () => {
    const component = await mountLoaded()

    await component.get(testId('recipe-form')).trigger('submit')
    await vi.waitFor(() => expect(patched).toHaveLength(1))

    expect(patched[0]).toMatchObject({ title: 'Spaghetti bolognese' })
  })

  it('returns to the recipe after saving', async () => {
    const component = await mountLoaded()

    await component.get(testId('recipe-form')).trigger('submit')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())

    expect(navigateToMock).toHaveBeenCalledWith('/recipes/r1')
  })

  it('refuses to edit a recipe belonging to someone else', async () => {
    response = detail({ canEdit: false })

    const component = await mountPage()

    await vi.waitFor(() => expect(component.text()).toContain('niet van jou'))

    expect(component.find(testId('recipe-form')).exists()).toBe(false)
  })
})
