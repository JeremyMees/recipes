<script setup lang="ts">
import type { RecipeInput } from '#shared/schemas/recipe'
import type { RecipeDraftSource } from '#shared/types/recipe'

const url = ref('')
const draft = ref<Partial<RecipeInput> | null>(null)
const draftImageUrl = ref<string | null>(null)
const importSource = ref<RecipeDraftSource | null>(null)

const toast = useToast()
const importRecipe = useImportRecipe()
const createRecipe = useCreateRecipe()
const normalizeImage = useRecipeImageNormalize()

const importMessage = computed(() => {
  switch (importSource.value) {
    case 'jsonld':
      return {
        color: 'success' as const,
        icon: 'i-ri-check-line',
        title: 'Recept ingelezen',
        description: 'Controleer de gegevens en pas aan waar nodig.',
      }
    case 'opengraph':
      return {
        color: 'warning' as const,
        icon: 'i-ri-alert-line',
        title: 'Gedeeltelijk ingelezen',
        description:
          'Deze site geeft geen receptgegevens door. Naam en afbeelding zijn overgenomen, de rest vul je zelf aan.',
      }
    case 'none':
    case 'unreachable':
      return {
        color: 'warning' as const,
        icon: 'i-ri-alert-line',
        title: 'Automatisch inlezen lukte niet',
        description:
          'Deze site blokkeert het ophalen. De link is bewaard, vul de rest zelf in.',
      }
    default:
      return null
  }
})

async function submitImport() {
  if (!url.value.trim()) return

  try {
    const result = await importRecipe.mutateAsync(url.value.trim())

    const { imageUrl, ...rest } = result.draft

    importSource.value = result.source
    draftImageUrl.value = imageUrl
    draft.value = rest

    if (imageUrl && rest.imageKey) {
      await normalize({ key: rest.imageKey, url: imageUrl })
    }
  } catch {
    toast.add({
      title: 'Link kon niet worden gelezen',
      description: 'Controleer of het een geldige link is.',
      color: 'error',
      icon: 'i-ri-error-warning-line',
    })
  }
}

async function normalize(source: { key: string; url: string }) {
  try {
    const image = await normalizeImage.mutateAsync(source)

    draftImageUrl.value = image.url
    draft.value = { ...draft.value, imageKey: image.key }
  } catch {
    return
  }
}

async function save(input: RecipeInput) {
  try {
    const { id } = await createRecipe.mutateAsync(input)

    toast.add({
      title: 'Recept bewaard',
      description: input.title,
      color: 'success',
      icon: 'i-ri-check-line',
    })

    await navigateTo(`/recipes/${id}`)
  } catch {
    toast.add({
      title: 'Opslaan is mislukt',
      color: 'error',
      icon: 'i-ri-error-warning-line',
    })
  }
}

useSeoMeta({ title: 'Recept toevoegen' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader
      title="Recept toevoegen"
      description="Plak een link van een receptensite, of vul alles zelf in."
    />

    <UCard>
      <form
        data-test-id="import-form"
        class="flex flex-col gap-3 sm:flex-row"
        @submit.prevent="submitImport"
      >
        <UInput
          v-model="url"
          icon="i-ri-link"
          type="url"
          placeholder="https://www.leukerecepten.nl/recepten/..."
          class="flex-1"
          data-test-id="import-url"
        />
        <UButton
          type="submit"
          label="Inlezen"
          color="primary"
          variant="solid"
          :loading="importRecipe.isPending.value"
          :disabled="!url.trim()"
          data-test-id="import-submit"
        />
      </form>
    </UCard>

    <UAlert
      v-if="importMessage"
      :color="importMessage.color"
      :icon="importMessage.icon"
      :title="importMessage.title"
      :description="importMessage.description"
      variant="subtle"
      data-test-id="import-message"
    />

    <RecipeForm
      :initial="draft"
      :image-url="draftImageUrl"
      submit-label="Recept bewaren"
      :loading="createRecipe.isPending.value"
      @submit="save"
    />
  </div>
</template>
