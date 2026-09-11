import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { RecipeInput, RecipeQuery } from '#shared/schemas/recipe'
import type {
  RecipeDetail,
  RecipeImportResult,
  RecipeListItem,
} from '#shared/types/recipe'

export type RecipeScope = 'own' | 'family'

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (scope: RecipeScope, query: RecipeQuery) =>
    [...recipeKeys.lists(), scope, query] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  tags: () => [...recipeKeys.all, 'tags'] as const,
}

function prefetchOnServer(query: { suspense: () => Promise<unknown> }) {
  onServerPrefetch(async () => {
    await query.suspense().catch(() => {})
  })
}

export function useRecipesQuery(
  scope: RecipeScope,
  query: MaybeRefOrGetter<RecipeQuery> = () => ({}),
) {
  const request = useRequestFetch()

  const result = useQuery({
    queryKey: computed(() => recipeKeys.list(scope, toValue(query))),
    queryFn: () =>
      request<RecipeListItem[]>(
        scope === 'own' ? '/api/recipes' : '/api/recipes/family',
        { query: toValue(query) },
      ),
    placeholderData: previous => previous,
    refetchOnMount: 'always',
  })

  prefetchOnServer(result)

  return result
}

export function useRecipeQuery(id: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  const result = useQuery({
    queryKey: computed(() => recipeKeys.detail(toValue(id))),
    queryFn: () => request<RecipeDetail>(`/api/recipes/${toValue(id)}`),
    enabled: computed(() => Boolean(toValue(id))),
  })

  prefetchOnServer(result)

  return result
}

export function useRecipeTagsQuery() {
  const request = useRequestFetch()

  const result = useQuery({
    queryKey: recipeKeys.tags(),
    queryFn: () => request<string[]>('/api/recipes/tags'),
  })

  prefetchOnServer(result)

  return result
}

export function useImportRecipe() {
  return useMutation({
    mutationFn: (url: string) =>
      $fetch<RecipeImportResult>('/api/recipes/import', {
        method: 'POST',
        body: { url },
      }),
  })
}

export function useCreateRecipe() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: RecipeInput) =>
      $fetch<{ id: string }>('/api/recipes', { method: 'POST', body: input }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useUpdateRecipe(id: MaybeRefOrGetter<string>) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: Partial<RecipeInput>) =>
      $fetch<{ id: string }>(`/api/recipes/${toValue(id)}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useDeleteRecipe() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      $fetch<{ id: string }>(`/api/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: recipeKeys.detail(id) })
      client.invalidateQueries({ queryKey: recipeKeys.lists() })
    },
  })
}
