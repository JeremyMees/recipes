<script setup lang="ts">
const providers = [
  {
    id: 'google',
    label: 'Inloggen met Google',
    icon: 'i-ri-google-fill',
    to: '/auth/google',
  },
  {
    id: 'facebook',
    label: 'Inloggen met Facebook',
    icon: 'i-ri-facebook-fill',
    to: '/auth/facebook',
  },
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <UButton
      v-for="provider in providers"
      :key="provider.id"
      :to="provider.to"
      :icon="provider.icon"
      :label="provider.label"
      :data-test-id="`auth-provider-${provider.id}`"
      external
      size="lg"
      block
    />
  </div>
</template>
