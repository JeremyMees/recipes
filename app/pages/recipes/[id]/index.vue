<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: recipe, isPending, error } = useRecipeQuery(id)
const { isSupported: isWakeLockSupported, request: requestWakeLock } =
  useWakeLock()

watch(
  recipe,
  value => {
    if (value && isWakeLockSupported.value) requestWakeLock('screen')
  },
  { immediate: true },
)

const checked = ref<Set<number>>(new Set())

function toggle(index: number) {
  const next = new Set(checked.value)

  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  checked.value = next
}

const ingredients = computed((): string[] => recipe.value?.ingredients ?? [])
const instructions = computed((): string[] => recipe.value?.instructions ?? [])

const steps = computed((): { text: string; position: number }[] =>
  instructions.value.map((text: string, index: number) => ({
    text,
    position: index + 1,
  })),
)

const ingredientRows = computed((): { text: string; index: number }[] =>
  ingredients.value.map((text: string, index: number) => ({ text, index })),
)

const duration = computed(() =>
  formatMinutes(
    totalMinutes(recipe.value?.prepMinutes, recipe.value?.cookMinutes),
  ),
)

const meta = computed(() => {
  if (!recipe.value) return []

  return [
    { icon: 'i-ri-user-line', value: formatServings(recipe.value.servings) },
    { icon: 'i-ri-time-line', value: duration.value },
    {
      icon: 'i-ri-group-line',
      value: recipe.value.canEdit ? null : recipe.value.authorName,
    },
  ].filter(entry => entry.value)
})

useSeoMeta({ title: () => recipe.value?.title ?? 'Recept' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-ri-error-warning-line"
      title="Dit recept kon niet worden geladen"
      description="Misschien is het verwijderd of hoort het niet bij de familie."
    />

    <div v-else-if="isPending && !recipe" class="flex flex-col gap-4">
      <USkeleton class="aspect-video w-full rounded-lg" />
      <USkeleton class="h-8 w-2/3" />
      <USkeleton class="h-4 w-1/3" />
    </div>

    <template v-else-if="recipe">
      <NuxtImg
        v-if="recipe.imageUrl"
        :src="recipe.imageUrl"
        :alt="recipe.title"
        :style="{ viewTransitionName: `recipe-image-${recipe.id}` }"
        sizes="100vw lg:1200px"
        preload
        data-test-id="recipe-detail-image"
        class="aspect-video w-full rounded-lg object-cover"
      />

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
          <h1
            :style="{ viewTransitionName: `recipe-title-${recipe.id}` }"
            class="text-3xl font-semibold text-highlighted"
          >
            {{ recipe.title }}
          </h1>

          <p v-if="recipe.description" class="text-muted">
            {{ recipe.description }}
          </p>

          <div class="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span
              v-for="entry in meta"
              :key="entry.icon"
              class="flex items-center gap-1"
            >
              <UIcon :name="entry.icon" class="size-4" />
              {{ entry.value }}
            </span>
          </div>

          <div v-if="recipe.tags.length" class="flex flex-wrap gap-1">
            <UBadge
              v-for="tag in recipe.tags"
              :key="tag"
              :label="tag"
              size="sm"
              color="neutral"
            />
          </div>
        </div>

        <div v-if="recipe.canEdit" class="flex items-center gap-2">
          <UButton
            :to="`/recipes/${recipe.id}/edit`"
            icon="i-ri-edit-line"
            label="Aanpassen"
            color="neutral"
          />
          <DeleteRecipeButton :id="recipe.id" :title="recipe.title" />
        </div>
      </div>

      <USeparator />

      <div class="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <section v-if="ingredientRows.length" class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-highlighted">Ingrediënten</h2>

          <ul class="flex flex-col gap-2">
            <li v-for="row in ingredientRows" :key="row.index">
              <UCheckbox
                :model-value="checked.has(row.index)"
                :label="row.text"
                data-test-id="ingredient-checkbox"
                @update:model-value="toggle(row.index)"
              />
            </li>
          </ul>
        </section>

        <section v-if="steps.length" class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-highlighted">
            Bereidingswijze
          </h2>

          <ol class="flex flex-col gap-4">
            <li v-for="step in steps" :key="step.position" class="flex gap-3">
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-full bg-elevated text-sm font-medium tabular-nums"
              >
                {{ step.position }}
              </span>
              <p class="whitespace-pre-line">{{ step.text }}</p>
            </li>
          </ol>
        </section>
      </div>

      <template v-if="recipe.notes">
        <USeparator />

        <section class="flex flex-col gap-2">
          <h2 class="text-lg font-semibold text-highlighted">Notities</h2>
          <p class="whitespace-pre-line text-muted">{{ recipe.notes }}</p>
        </section>
      </template>

      <template v-if="recipe.sourceUrl">
        <USeparator />

        <UButton
          :to="recipe.sourceUrl"
          :label="recipe.sourceName ?? 'Bekijk het origineel'"
          icon="i-ri-external-link-line"
          color="neutral"
          variant="link"
          target="_blank"
          external
          class="self-start"
        />
      </template>
    </template>
  </div>
</template>
