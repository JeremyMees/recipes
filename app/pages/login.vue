<script setup lang="ts">
const route = useRoute()

const errors: Record<string, string> = {
  not_allowed:
    'Dit e-mailadres hoort niet bij de familie. Vraag Jeremy om je toe te voegen.',
  oauth_failed: 'Inloggen is mislukt. Probeer het opnieuw.',
}

const error = computed(() => {
  const key = route.query.error

  return typeof key === 'string' ? errors[key] : undefined
})

useSeoMeta({
  title: 'Inloggen',
})
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center">
    <UCard class="w-full max-w-sm">
      <div class="flex flex-col gap-6 text-center">
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            Familierecepten
          </h1>
          <p class="text-sm text-muted">
            Log in om je recepten te bekijken en te bewaren.
          </p>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-ri-error-warning-line"
          :description="error"
          data-test-id="login-error"
        />

        <AuthProviderButtons />
      </div>
    </UCard>
  </div>
</template>
