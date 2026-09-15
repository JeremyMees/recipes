<script setup lang="ts">
import type { RecipeInput } from '#shared/schemas/recipe'
import type {
  RecipeDraftSource,
  RecipeImportResult,
} from '#shared/types/recipe'
import { RECIPE_TEXT_MAX } from '#shared/schemas/recipe'

const route = useRoute()

function queryValue(key: string): string {
  const value = route.query[key]

  return typeof value === 'string' ? value.trim() : ''
}

function onlyUrl(value: string): string {
  return /^https?:\/\/\S+$/.test(value) ? value : ''
}

const sharedUrl = queryValue('url')
const sharedText = queryValue('text')

const url = ref(sharedUrl || onlyUrl(sharedText))
const text = ref(onlyUrl(sharedText) ? '' : sharedText)
const tab = ref(text.value ? 'text' : 'link')

const draft = ref<Partial<RecipeInput> | null>(null)
const draftImageUrl = ref<string | null>(null)
const importSource = ref<RecipeDraftSource | null>(null)

const toast = useToast()
const importRecipe = useImportRecipe()
const importText = useImportRecipeText()
const createRecipe = useCreateRecipe()
const normalizeImage = useRecipeImageNormalize()

const tabs = [
  { value: 'link', label: 'Link', icon: 'i-ri-link' },
  { value: 'text', label: 'Tekst plakken', icon: 'i-ri-clipboard-line' },
]

const importMessage = computed(() => {
  switch (importSource.value) {
    case 'jsonld':
    case 'microdata':
      return {
        color: 'success' as const,
        icon: 'i-ri-check-line',
        title: 'Recept ingelezen',
        description: 'Controleer de gegevens en pas aan waar nodig.',
      }
    case 'ai':
      return {
        color: 'success' as const,
        icon: 'i-ri-sparkling-line',
        title: 'Recept uit tekst gehaald',
        description:
          'Dit is automatisch samengesteld. Kijk de hoeveelheden en stappen goed na.',
      }
    case 'social':
      return {
        color: 'warning' as const,
        icon: 'i-ri-instagram-line',
        title: 'Instagram en Facebook geven het recept niet vrij',
        description:
          'Open het bericht, kopieer het bijschrift en plak het bij "Tekst plakken". De link wordt bewaard.',
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
          'Kopieer de pagina en plak de tekst bij "Tekst plakken", of vul het recept zelf in.',
      }
    default:
      return null
  }
})

function apply(result: RecipeImportResult) {
  const { imageUrl, ...rest } = result.draft

  importSource.value = result.source
  draftImageUrl.value = imageUrl
  draft.value = rest

  return { imageUrl, imageKey: rest.imageKey }
}

function failed(title: string) {
  toast.add({
    title,
    description: 'Probeer het opnieuw of vul het recept zelf in.',
    color: 'error',
    icon: 'i-ri-error-warning-line',
  })
}

async function submitImport() {
  if (!url.value.trim()) return

  try {
    const result = await importRecipe.mutateAsync(url.value.trim())
    const image = apply(result)

    if (result.source === 'social') tab.value = 'text'

    if (image.imageUrl && image.imageKey) {
      await normalize({ key: image.imageKey, url: image.imageUrl })
    }
  } catch {
    failed('Link kon niet worden gelezen')
  }
}

async function submitText() {
  if (!text.value.trim()) return

  try {
    const result = await importText.mutateAsync({
      text: text.value.trim(),
      sourceUrl: url.value.trim() || null,
    })

    if (result.source === 'none') {
      failed('Geen recept gevonden in deze tekst')

      return
    }

    const image = apply(result)

    if (image.imageUrl && image.imageKey) {
      await normalize({ key: image.imageKey, url: image.imageUrl })
    }
  } catch {
    failed('Tekst kon niet worden gelezen')
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
      description="Plak een link, plak de tekst van een recept of bijschrift, of vul alles zelf in."
    />

    <UCard>
      <UTabs v-model="tab" :items="tabs" :content="false" class="mb-4" />

      <form
        v-if="tab === 'link'"
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

      <form
        v-else
        data-test-id="import-text-form"
        class="flex flex-col gap-3"
        @submit.prevent="submitText"
      >
        <UTextarea
          v-model="text"
          :rows="8"
          :maxlength="RECIPE_TEXT_MAX"
          placeholder="Plak hier het bijschrift van een Instagram- of Facebookbericht, of de tekst van een receptpagina."
          data-test-id="import-text"
        />
        <div class="flex items-center justify-between gap-3">
          <p class="text-muted text-sm">
            Werkt ook voor sites die het recept niet vrijgeven.
          </p>
          <UButton
            type="submit"
            label="Tekst inlezen"
            color="primary"
            variant="solid"
            :loading="importText.isPending.value"
            :disabled="!text.trim()"
            data-test-id="import-text-submit"
          />
        </div>
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
