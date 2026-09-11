<script setup lang="ts">
const props = defineProps<{
  id: string
  title: string
}>()

const open = ref(false)
const toast = useToast()
const { mutateAsync, isPending } = useDeleteRecipe()

async function confirm() {
  try {
    await mutateAsync(props.id)

    toast.add({
      title: 'Recept verwijderd',
      description: props.title,
      color: 'success',
      icon: 'i-ri-check-line',
    })

    open.value = false

    await navigateTo('/')
  } catch {
    toast.add({
      title: 'Verwijderen is mislukt',
      color: 'error',
      icon: 'i-ri-error-warning-line',
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Recept verwijderen?"
    :description="`${props.title} wordt definitief verwijderd.`"
  >
    <UButton
      icon="i-ri-delete-bin-line"
      label="Verwijderen"
      color="error"
      variant="ghost"
    />

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Annuleren"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          label="Verwijderen"
          color="error"
          :loading="isPending"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
