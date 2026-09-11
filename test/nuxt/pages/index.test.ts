import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { USelect } from '#components'
import IndexPage from '~/pages/index.vue'
import { testId } from '~~/test/unit/stubs/selectors'

const listCalls: Record<string, string>[] = []

registerEndpoint('/api/recipes', {
  method: 'GET',
  handler: event => {
    listCalls.push(
      Object.fromEntries(new URL(event.path, 'http://test').searchParams),
    )

    return [
      {
        id: 'r1',
        title: 'Spaghetti bolognese',
        description: null,
        imageUrl: null,
        sourceName: null,
        servings: 4,
        prepMinutes: 15,
        cookMinutes: 30,
        tags: ['pasta'],
        createdAt: '2026-09-01T10:00:00.000Z',
        authorName: 'Jeremy',
      },
    ]
  },
})

registerEndpoint('/api/recipes/tags', {
  method: 'GET',
  handler: () => ['pasta', 'soep'],
})

function mountPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })

  return mountSuspended(IndexPage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

describe('my recipes page', () => {
  beforeEach(() => {
    listCalls.length = 0
  })

  it('links to the add-recipe page', async () => {
    const component = await mountPage()

    expect(component.get(testId('add-recipe')).attributes('href')).toBe(
      '/recipes/new',
    )
  })

  it('renders a card for each of my recipes without an author badge', async () => {
    const component = await mountPage()

    await vi.waitFor(() =>
      expect(component.findAll(testId('recipe-card'))).toHaveLength(1),
    )

    expect(component.get(testId('recipe-card-title')).text()).toBe(
      'Spaghetti bolognese',
    )
    expect(component.find(testId('recipe-card-author')).exists()).toBe(false)
  })

  it('asks for the unfiltered list on first load', async () => {
    await mountPage()

    await vi.waitFor(() => expect(listCalls).toHaveLength(1))

    expect(listCalls[0]).toEqual({})
  })

  it('sends the search term after the debounce settles', async () => {
    const component = await mountPage()

    await vi.waitFor(() => expect(listCalls).toHaveLength(1))

    await component.get(testId('recipes-search')).setValue('pasta')

    await vi.waitFor(() => expect(listCalls.at(-1)).toEqual({ q: 'pasta' }), {
      timeout: 3000,
    })
  })

  it('hides the clear button until a tag is active', async () => {
    const component = await mountPage()

    await vi.waitFor(() =>
      expect(component.find(testId('recipes-tag-filter')).exists()).toBe(true),
    )

    expect(component.find(testId('recipes-tag-clear')).exists()).toBe(false)
  })

  it('filters by tag and clears back to the full list', async () => {
    const component = await mountPage()

    await vi.waitFor(() => expect(listCalls).toHaveLength(1))

    const tagSelect = component.findComponent(USelect) as unknown as {
      vm: { $emit: (event: string, value: unknown) => void }
    }

    tagSelect.vm.$emit('update:modelValue', 'pasta')

    await vi.waitFor(() => expect(listCalls.at(-1)).toEqual({ tag: 'pasta' }))

    await component.get(testId('recipes-tag-clear')).trigger('click')

    await vi.waitFor(() => expect(listCalls.at(-1)).toEqual({}))
  })
})
