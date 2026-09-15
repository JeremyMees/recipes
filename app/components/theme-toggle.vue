<script setup lang="ts">
const colorMode = useColorMode()

function onClick(event: MouseEvent) {
  revealTransition(() => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }, event.currentTarget as HTMLElement)
}
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    square
    aria-label="Thema wisselen"
    @click="onClick"
  >
    <template #leading="{ ui }">
      <UIcon
        :class="ui.leadingIcon({ class: 'dark:hidden' })"
        name="i-ri-sun-line"
      />
      <UIcon
        :class="ui.leadingIcon({ class: 'hidden dark:inline-block' })"
        name="i-ri-moon-line"
      />
    </template>
  </UButton>
</template>
