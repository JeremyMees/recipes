import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import FamilyPage from '~/pages/family.vue'
import { testId } from '~~/test/unit/stubs/selectors'

const familyCalls: Record<string, string>[] = []

registerEndpoint('/api/recipes/family', {
  method: 'GET',
  handler: event => {
    familyCalls.push(
      Object.fromEntries(new URL(event.path, 'http://test').searchParams),
    )

    return [
      {
        id: 'f1',
        title: 'Appelmoes van oma',
        description: null,
        imageUrl: null,
        sourceName: null,
        servings: null,
        prepMinutes: null,
        cookMinutes: null,
        tags: [],
        createdAt: '2026-09-01T10:00:00.000Z',
        authorName: 'Oma',
      },
    ]
  },
})

function mountPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })

  return mountSuspended(FamilyPage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

describe('family page', () => {
  beforeEach(() => {
    familyCalls.length = 0
  })

  it('reads from the family endpoint', async () => {
    await mountPage()

    await vi.waitFor(() => expect(familyCalls).toHaveLength(1))
  })

  it('credits the author on every card', async () => {
    const component = await mountPage()

    await vi.waitFor(() =>
      expect(component.findAll(testId('recipe-card'))).toHaveLength(1),
    )

    expect(component.get(testId('recipe-card-author')).text()).toBe('Oma')
  })

  it('offers no way to add a recipe from here', async () => {
    const component = await mountPage()

    expect(component.find(testId('add-recipe')).exists()).toBe(false)
  })

  it('sends the search term once the debounce settles', async () => {
    const component = await mountPage()

    await vi.waitFor(() => expect(familyCalls).toHaveLength(1))

    await component.get(testId('family-search')).setValue('appelmoes')

    await vi.waitFor(
      () => expect(familyCalls.at(-1)).toEqual({ q: 'appelmoes' }),
      { timeout: 3000 },
    )
  })
})
