import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent } from 'vue'
import {
  recipeKeys,
  useCreateRecipe,
  useDeleteRecipe,
  useImportRecipe,
  useRecipeQuery,
  useRecipeTagsQuery,
  useRecipesQuery,
  useUpdateRecipe,
} from '~/composables/use-recipes'

interface Call {
  method: string
  query: Record<string, string>
  body?: unknown
}

const calls: Record<string, Call[]> = {}

function record(name: string) {
  return async (event: {
    path: string
    method: string
    node: { req: { method?: string } }
  }) => {
    const query = Object.fromEntries(
      new URL(event.path, 'http://test').searchParams,
    )

    calls[name] ??= []
    calls[name].push({ method: event.method, query })

    return name
  }
}

registerEndpoint('/api/recipes', { method: 'GET', handler: record('list') })
registerEndpoint('/api/recipes', {
  method: 'POST',
  handler: () => {
    calls.create ??= []
    calls.create.push({ method: 'POST', query: {} })

    return { id: 'new-1' }
  },
})
registerEndpoint('/api/recipes/family', {
  method: 'GET',
  handler: record('family'),
})
registerEndpoint('/api/recipes/tags', {
  method: 'GET',
  handler: () => ['pasta', 'soep'],
})
registerEndpoint('/api/recipes/import', {
  method: 'POST',
  handler: () => ({ source: 'jsonld', draft: { title: 'Ingelezen' } }),
})
registerEndpoint('/api/recipes/r1', {
  method: 'GET',
  handler: () => ({ id: 'r1', title: 'Recept een', canEdit: true }),
})
registerEndpoint('/api/recipes/r1', {
  method: 'PATCH',
  handler: () => {
    calls.update ??= []
    calls.update.push({ method: 'PATCH', query: {} })

    return { id: 'r1' }
  },
})
registerEndpoint('/api/recipes/r1', {
  method: 'DELETE',
  handler: () => {
    calls.remove ??= []
    calls.remove.push({ method: 'DELETE', query: {} })

    return { id: 'r1' }
  },
})

function runComposable<T>(composable: () => T) {
  let result!: T

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const harness = defineComponent({
    setup() {
      result = composable()

      return () => null
    },
  })

  return mountSuspended(harness, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  }).then(() => ({ result, queryClient }))
}

beforeEach(() => {
  for (const key of Object.keys(calls)) calls[key] = []
})

describe('recipeKeys', () => {
  it('nests list and detail keys under one root so invalidation catches both', () => {
    expect(recipeKeys.all).toEqual(['recipes'])
    expect(recipeKeys.lists()).toEqual(['recipes', 'list'])
    expect(recipeKeys.detail('r1')).toEqual(['recipes', 'detail', 'r1'])
    expect(recipeKeys.tags()).toEqual(['recipes', 'tags'])
  })

  it('separates own and family lists, and varies by query', () => {
    expect(recipeKeys.list('own', {})).not.toEqual(
      recipeKeys.list('family', {}),
    )
    expect(recipeKeys.list('own', { q: 'pasta' })).not.toEqual(
      recipeKeys.list('own', {}),
    )
  })
})

describe('useRecipesQuery', () => {
  it('reads own recipes from /api/recipes', async () => {
    const { result } = await runComposable(() => useRecipesQuery('own'))

    await vi.waitFor(() => expect(result.data.value).toBe('list'))
    expect(calls.list).toHaveLength(1)
  })

  it('reads family recipes from the family endpoint', async () => {
    const { result } = await runComposable(() => useRecipesQuery('family'))

    await vi.waitFor(() => expect(result.data.value).toBe('family'))
    expect(calls.family).toHaveLength(1)
  })

  it('forwards the search term and tag as query params', async () => {
    const { result } = await runComposable(() =>
      useRecipesQuery('own', () => ({ q: 'pasta', tag: 'italiaans' })),
    )

    await vi.waitFor(() => expect(result.data.value).toBe('list'))

    expect(calls.list!.at(-1)!.query).toMatchObject({
      q: 'pasta',
      tag: 'italiaans',
    })
  })

  it('refetches when the query changes', async () => {
    const query = ref({ q: 'pasta' })

    const { result } = await runComposable(() => useRecipesQuery('own', query))

    await vi.waitFor(() => expect(result.data.value).toBe('list'))

    query.value = { q: 'rijst' }

    await vi.waitFor(() => expect(calls.list).toHaveLength(2))

    expect(calls.list!.map(call => call.query.q)).toEqual(['pasta', 'rijst'])
  })
})

describe('useRecipeQuery', () => {
  it('reads a single recipe by id', async () => {
    const { result } = await runComposable(() => useRecipeQuery('r1'))

    await vi.waitFor(() => expect(result.data.value).toBeDefined())

    expect(result.data.value).toMatchObject({ id: 'r1', canEdit: true })
  })

  it('stays idle without an id', async () => {
    const { result } = await runComposable(() => useRecipeQuery(''))

    expect(result.data.value).toBeUndefined()
    expect(result.fetchStatus.value).toBe('idle')
  })
})

describe('useRecipeTagsQuery', () => {
  it('reads the tag list', async () => {
    const { result } = await runComposable(() => useRecipeTagsQuery())

    await vi.waitFor(() => expect(result.data.value).toBeDefined())

    expect(result.data.value).toEqual(['pasta', 'soep'])
  })
})

describe('mutations', () => {
  it('creates a recipe and invalidates every recipe query', async () => {
    const { result, queryClient } = await runComposable(() => useCreateRecipe())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const created = await result.mutateAsync({ title: 'Nieuw' } as never)

    expect(created).toEqual({ id: 'new-1' })
    expect(calls.create).toHaveLength(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: recipeKeys.all })
  })

  it('updates a recipe with PATCH', async () => {
    const { result, queryClient } = await runComposable(() =>
      useUpdateRecipe('r1'),
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.mutateAsync({ title: 'Aangepast' })

    expect(calls.update).toHaveLength(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: recipeKeys.all })
  })

  it('drops the detail cache and refreshes the lists after deleting', async () => {
    const { result, queryClient } = await runComposable(() => useDeleteRecipe())
    const remove = vi.spyOn(queryClient, 'removeQueries')
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.mutateAsync('r1')

    expect(calls.remove).toHaveLength(1)
    expect(remove).toHaveBeenCalledWith({
      queryKey: recipeKeys.detail('r1'),
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: recipeKeys.lists() })
  })

  it('imports a draft without writing anything', async () => {
    const { result, queryClient } = await runComposable(() => useImportRecipe())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const imported = await result.mutateAsync('https://x.test/recept')

    expect(imported).toMatchObject({ source: 'jsonld' })
    expect(invalidate).not.toHaveBeenCalled()
  })
})
