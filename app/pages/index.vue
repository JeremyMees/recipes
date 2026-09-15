<script setup lang="ts">
const search = ref('')
const tag = ref<string | undefined>(undefined)

const debouncedSearch = refDebounced(search, 300)

const query = computed(() => ({
  ...(debouncedSearch.value ? { q: debouncedSearch.value } : {}),
  ...(tag.value ? { tag: tag.value } : {}),
}))

const { recipes, isPending, error, hasNextPage, loadMore } = useRecipesQuery(
  'own',
  query,
)
const { data: tags } = useRecipeTagsQuery()

useSeoMeta({ title: 'Mijn recepten' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Mijn recepten" :ui="{ title: 'font-logo' }">
      <template #links>
        <UButton
          to="/recipes/new"
          icon="i-ri-add-line"
          label="Recept toevoegen"
          color="primary"
          variant="solid"
          data-test-id="add-recipe"
        />
      </template>
    </UPageHeader>

    <div class="flex flex-col gap-3 sm:flex-row">
      <UInput
        v-model="search"
        icon="i-ri-search-line"
        placeholder="Zoek op naam of omschrijving"
        class="flex-1"
        data-test-id="recipes-search"
      />

      <div class="flex items-center gap-1">
        <USelect
          v-model="tag"
          :items="tags ?? []"
          placeholder="Alle labels"
          class="flex-1 sm:w-56"
          data-test-id="recipes-tag-filter"
        />
        <UButton
          v-if="tag"
          icon="i-ri-close-line"
          color="neutral"
          variant="ghost"
          aria-label="Labelfilter wissen"
          data-test-id="recipes-tag-clear"
          @click="tag = undefined"
        />
      </div>
    </div>

    <RecipeGrid
      :recipes="recipes"
      :pending="isPending"
      :error="error"
      :has-more="hasNextPage"
      empty-title="Nog geen recepten"
      empty-description="Plak een link van een receptensite om te beginnen."
      @load-more="loadMore"
    />
  </div>
</template>
