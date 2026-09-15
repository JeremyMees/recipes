<script setup lang="ts">
import type { RecipeInput } from '#shared/schemas/recipe'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: recipe, isPending, error } = useRecipeQuery(id)
const updateRecipe = useUpdateRecipe(id)
const toast = useToast()

const initial = computed<Partial<RecipeInput> | null>(() => {
  if (!recipe.value) return null

  const {
    title,
    description,
    imageKey,
    sourceUrl,
    sourceName,
    servings,
    prepMinutes,
    cookMinutes,
    ingredients,
    instructions,
    tags,
    notes,
  } = recipe.value

  return {
    title,
    description,
    imageKey,
    sourceUrl,
    sourceName,
    servings,
    prepMinutes,
    cookMinutes,
    ingredients,
    instructions,
    tags,
    notes,
  }
})

async function save(input: RecipeInput) {
  try {
    await updateRecipe.mutateAsync(input)

    toast.add({
      title: 'Wijzigingen bewaard',
      color: 'success',
      icon: 'i-ri-check-line',
    })

    await navigateTo(`/recipes/${id.value}`)
  } catch {
    toast.add({
      title: 'Opslaan is mislukt',
      color: 'error',
      icon: 'i-ri-error-warning-line',
    })
  }
}

useSeoMeta({ title: () => `${recipe.value?.title ?? 'Recept'} aanpassen` })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-ri-error-warning-line"
      title="Dit recept kon niet worden geladen"
    />

    <div v-else-if="isPending && !recipe" class="flex flex-col gap-4">
      <USkeleton class="h-8 w-1/2" />
      <USkeleton class="h-64 w-full" />
    </div>

    <template v-else-if="recipe">
      <UAlert
        v-if="!recipe.canEdit"
        color="warning"
        variant="subtle"
        icon="i-ri-alert-line"
        title="Dit recept is niet van jou"
        description="Je kunt alleen je eigen recepten aanpassen."
      />

      <template v-else>
        <UPageHeader
          :title="`${recipe.title} aanpassen`"
          :ui="{ title: 'font-logo' }"
        />

        <RecipeForm
          :initial="initial"
          :image-url="recipe.imageUrl"
          submit-label="Wijzigingen bewaren"
          :loading="updateRecipe.isPending.value"
          @submit="save"
        >
          <template #actions>
            <UButton
              :to="`/recipes/${recipe.id}`"
              label="Annuleren"
              color="neutral"
              variant="ghost"
            />
          </template>
        </RecipeForm>
      </template>
    </template>
  </div>
</template>
