<script setup lang="ts">
import type { RecipeListItem } from '#shared/types/recipe'

const props = withDefaults(
  defineProps<{
    recipes?: RecipeListItem[]
    pending?: boolean
    error: Error | null
    showAuthor?: boolean
    hasMore?: boolean
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    recipes: () => [],
    pending: false,
    showAuthor: false,
    hasMore: false,
    emptyTitle: 'Nog geen recepten',
    emptyDescription: 'Voeg je eerste recept toe met een link.',
  },
)

const emit = defineEmits<{ loadMore: [] }>()

const sentinel = useTemplateRef<HTMLElement>('sentinel')

useIntersectionObserver(
  sentinel,
  entries => {
    if (entries.some(entry => entry.isIntersecting)) emit('loadMore')
  },
  { rootMargin: '600px 0px' },
)
</script>

<template>
  <UAlert
    v-if="props.error"
    color="error"
    variant="subtle"
    icon="i-ri-error-warning-line"
    title="Recepten konden niet worden geladen"
    description="Probeer de pagina te herladen."
    data-test-id="recipe-grid-error"
  />

  <UPageGrid v-else-if="props.pending && !props.recipes.length">
    <div
      v-for="index in 6"
      :key="index"
      data-test-id="recipe-grid-skeleton"
      class="flex flex-col gap-3 rounded-lg border border-default p-4"
    >
      <USkeleton class="aspect-video w-full" />
      <USkeleton class="h-4 w-3/4" />
      <USkeleton class="h-3 w-1/2" />
    </div>
  </UPageGrid>

  <UEmpty
    v-else-if="!props.recipes.length"
    icon="i-ri-restaurant-line"
    :title="props.emptyTitle"
    :description="props.emptyDescription"
    data-test-id="recipe-grid-empty"
  />

  <div v-else class="flex flex-col gap-6">
    <UPageGrid data-test-id="recipe-grid">
      <RecipeCard
        v-for="(recipe, i) in props.recipes"
        :key="recipe.id"
        :index="i"
        :recipe="recipe"
        :show-author="props.showAuthor"
      />
    </UPageGrid>

    <div
      v-if="props.hasMore"
      ref="sentinel"
      data-test-id="recipe-grid-sentinel"
      class="flex items-center justify-center py-4"
    >
      <UIcon
        name="i-ri-loader-4-line"
        class="size-6 animate-spin text-dimmed"
        data-test-id="recipe-grid-loading-more"
      />
    </div>
  </div>
</template>
