<script setup lang="ts">
import type { RecipeListItem } from '#shared/types/recipe'

const props = withDefaults(
  defineProps<{
    recipes?: RecipeListItem[]
    pending?: boolean
    error: Error | null
    showAuthor?: boolean
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    recipes: () => [],
    pending: false,
    showAuthor: false,
    emptyTitle: 'Nog geen recepten',
    emptyDescription: 'Voeg je eerste recept toe met een link.',
  },
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

  <UPageGrid v-else data-test-id="recipe-grid">
    <RecipeCard
      v-for="recipe in props.recipes"
      :key="recipe.id"
      :recipe="recipe"
      :show-author="props.showAuthor"
    />
  </UPageGrid>
</template>
