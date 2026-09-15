<script setup lang="ts">
const ready = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    ready.value = true
  })
})
</script>

<template>
  <div id="splash-screen" :data-ready="ready" aria-hidden="true">
    <LogoMark class="size-28" />
  </div>
</template>
