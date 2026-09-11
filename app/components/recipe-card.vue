<script setup lang="ts">
import type { RecipeListItem } from '#shared/types/recipe'

const props = withDefaults(
  defineProps<{
    recipe: RecipeListItem
    showAuthor?: boolean
  }>(),
  { showAuthor: false },
)

const duration = computed(() =>
  formatMinutes(
    totalMinutes(props.recipe.prepMinutes, props.recipe.cookMinutes),
  ),
)

const servings = computed(() => formatServings(props.recipe.servings))
</script>

<template>
  <NuxtLink
    :to="`/recipes/${props.recipe.id}`"
    data-test-id="recipe-card"
    class="group flex flex-col overflow-hidden rounded-lg border border-default bg-default transition hover:border-accented focus-visible:outline-2 focus-visible:outline-primary"
  >
    <div class="aspect-video overflow-hidden bg-elevated">
      <NuxtImg
        v-if="props.recipe.imageUrl"
        :src="props.recipe.imageUrl"
        :alt="props.recipe.title"
        :style="{ viewTransitionName: `recipe-image-${props.recipe.id}` }"
        sizes="100vw sm:50vw lg:384px"
        loading="lazy"
        data-test-id="recipe-card-image"
        class="size-full object-cover transition group-hover:scale-105"
      />
      <div
        v-else
        data-test-id="recipe-card-image-fallback"
        class="flex size-full items-center justify-center"
      >
        <UIcon name="i-ri-restaurant-line" class="size-8 text-dimmed" />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <h3
        data-test-id="recipe-card-title"
        :style="{ viewTransitionName: `recipe-title-${props.recipe.id}` }"
        class="font-semibold text-highlighted line-clamp-2"
      >
        {{ props.recipe.title }}
      </h3>

      <p
        v-if="props.recipe.description"
        data-test-id="recipe-card-description"
        class="text-sm text-muted line-clamp-2"
      >
        {{ props.recipe.description }}
      </p>

      <div
        class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted"
      >
        <span
          v-if="duration"
          data-test-id="recipe-card-duration"
          class="flex items-center gap-1"
        >
          <UIcon name="i-ri-time-line" class="size-3.5" />
          {{ duration }}
        </span>
        <span
          v-if="servings"
          data-test-id="recipe-card-servings"
          class="flex items-center gap-1"
        >
          <UIcon name="i-ri-user-line" class="size-3.5" />
          {{ servings }}
        </span>
        <span
          v-if="props.showAuthor && props.recipe.authorName"
          data-test-id="recipe-card-author"
          class="flex items-center gap-1"
        >
          <UIcon name="i-ri-group-line" class="size-3.5" />
          {{ props.recipe.authorName }}
        </span>
      </div>

      <div v-if="props.recipe.tags.length" class="flex flex-wrap gap-1">
        <UBadge
          v-for="tag in props.recipe.tags.slice(0, 3)"
          :key="tag"
          :label="tag"
          size="sm"
          color="neutral"
          data-test-id="recipe-card-tag"
        />
      </div>
    </div>
  </NuxtLink>
</template>
