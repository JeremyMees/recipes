<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { recipeInputSchema, type RecipeInput } from '#shared/schemas/recipe'

const props = withDefaults(
  defineProps<{
    initial?: Partial<RecipeInput> | null
    imageUrl?: string | null
    submitLabel?: string
    loading?: boolean
  }>(),
  {
    initial: null,
    imageUrl: null,
    submitLabel: 'Opslaan',
    loading: false,
  },
)

const emit = defineEmits<{ submit: [RecipeInput] }>()

function blankState(): RecipeInput {
  return {
    title: '',
    description: null,
    imageKey: null,
    sourceUrl: null,
    sourceName: null,
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [],
    instructions: [],
    tags: [],
    notes: null,
  }
}

const state = reactive<RecipeInput>({
  ...blankState(),
  ...(props.initial ?? {}),
})

const toast = useToast()
const uploadImage = useRecipeImageUpload()
const deleteImage = useRecipeImageDelete()
const file = ref<File | null | undefined>(null)
const preview = ref<string | null>(props.imageUrl)

watch(
  () => props.initial,
  (initial: Partial<RecipeInput> | null) => {
    Object.assign(state, blankState(), initial ?? {})
    preview.value = props.imageUrl
  },
)

async function discard(key: string | null | undefined) {
  if (!key) return

  await deleteImage.mutateAsync(key).catch(() => {})
}

watch(file, async (next: File | null | undefined) => {
  if (!next) return

  const superseded = state.imageKey

  try {
    const { key, url } = await uploadImage.mutateAsync(next)

    state.imageKey = key
    preview.value = url

    await discard(superseded)
  } catch {
    toast.add({
      title: 'Afbeelding uploaden is mislukt',
      color: 'error',
      icon: 'i-ri-error-warning-line',
    })
  } finally {
    file.value = null
  }
})

async function clearImage() {
  const superseded = state.imageKey

  state.imageKey = null
  preview.value = null

  await discard(superseded)
}

function onSubmit(event: FormSubmitEvent<RecipeInput>) {
  emit('submit', event.data)
}
</script>

<template>
  <UForm
    :schema="recipeInputSchema"
    :state="state"
    class="flex flex-col gap-6"
    data-test-id="recipe-form"
    @submit="onSubmit"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField name="title" label="Naam" required class="sm:col-span-2">
        <UInput
          v-model="state.title"
          placeholder="Spaghetti bolognese"
          class="w-full"
          data-test-id="recipe-form-title"
        />
      </UFormField>

      <UFormField
        name="description"
        label="Korte omschrijving"
        class="sm:col-span-2"
      >
        <UTextarea
          v-model.nullable="state.description"
          :rows="2"
          autoresize
          placeholder="Waar gaat dit recept over?"
          class="w-full"
        />
      </UFormField>

      <UFormField name="servings" label="Aantal personen">
        <UInputNumber
          v-model="state.servings"
          :min="1"
          :max="200"
          class="w-full"
        />
      </UFormField>

      <UFormField name="tags" label="Labels" hint="Enter om toe te voegen">
        <UInputTags v-model="state.tags" placeholder="pasta" class="w-full" />
      </UFormField>

      <UFormField name="prepMinutes" label="Voorbereiding (min)">
        <UInputNumber v-model="state.prepMinutes" :min="0" class="w-full" />
      </UFormField>

      <UFormField name="cookMinutes" label="Bereiding (min)">
        <UInputNumber v-model="state.cookMinutes" :min="0" class="w-full" />
      </UFormField>

      <UFormField name="imageKey" label="Afbeelding" class="sm:col-span-2">
        <div v-if="preview" class="flex items-start gap-3">
          <img
            :src="preview"
            alt=""
            data-test-id="recipe-form-image"
            class="aspect-video w-48 rounded-lg object-cover"
          />
          <UButton
            icon="i-ri-delete-bin-line"
            label="Verwijderen"
            color="error"
            variant="soft"
            size="sm"
            data-test-id="recipe-form-image-remove"
            @click="clearImage"
          />
        </div>
        <UFileUpload
          v-else
          v-model="file"
          icon="i-ri-image-line"
          label="Sleep een foto hierheen"
          :description="
            uploadImage.isPending.value
              ? 'Bezig met uploaden...'
              : 'JPG, PNG of WebP - wordt automatisch verkleind'
          "
          accept="image/*"
          :disabled="uploadImage.isPending.value"
          data-test-id="recipe-form-image-upload"
          class="min-h-40 w-full"
        />
      </UFormField>

      <UFormField name="sourceUrl" label="Originele link">
        <UInput
          v-model.nullable="state.sourceUrl"
          placeholder="https://..."
          class="w-full"
        />
      </UFormField>

      <UFormField name="sourceName" label="Bron">
        <UInput
          v-model.nullable="state.sourceName"
          placeholder="leukerecepten.nl"
          class="w-full"
        />
      </UFormField>
    </div>

    <USeparator />

    <UFormField name="ingredients" label="Ingrediënten">
      <StringListEditor
        v-model="state.ingredients"
        placeholder="125 gr ontbijtspek in blokjes"
        add-label="Ingrediënt toevoegen"
      />
    </UFormField>

    <USeparator />

    <UFormField name="instructions" label="Bereidingswijze">
      <StringListEditor
        v-model="state.instructions"
        placeholder="Bak de spekjes in een droge koekenpan."
        add-label="Stap toevoegen"
        multiline
        numbered
      />
    </UFormField>

    <USeparator />

    <UFormField name="notes" label="Eigen notities">
      <UTextarea
        v-model.nullable="state.notes"
        :rows="3"
        autoresize
        placeholder="Volgende keer wat minder zout."
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-2">
      <slot name="actions" />
      <UButton
        type="submit"
        :label="props.submitLabel"
        :loading="props.loading"
        color="primary"
        variant="solid"
        data-test-id="recipe-form-submit"
      />
    </div>
  </UForm>
</template>
