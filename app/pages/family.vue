<script setup lang="ts">
const search = ref('')
const debouncedSearch = refDebounced(search, 300)

const query = computed(() =>
  debouncedSearch.value ? { q: debouncedSearch.value } : {},
)

const { recipes, isPending, error, hasNextPage, loadMore } = useRecipesQuery(
  'family',
  query,
)

useSeoMeta({ title: 'Familie' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader
      title="Familierecepten"
      description="Alles wat de rest van de familie heeft bewaard."
    />

    <UInput
      v-model="search"
      icon="i-ri-search-line"
      placeholder="Zoek op naam of omschrijving"
      data-test-id="family-search"
    />

    <RecipeGrid
      :recipes="recipes"
      :pending="isPending"
      :error="error"
      :has-more="hasNextPage"
      show-author
      empty-title="Nog niets van de familie"
      empty-description="Zodra iemand anders een recept bewaart, zie je het hier."
      @load-more="loadMore"
    />
  </div>
</template>
