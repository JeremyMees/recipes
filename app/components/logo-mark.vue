<script setup lang="ts">
import logo from '~~/public/logo.svg?raw'

const svg = logo.replace(/ (?:width|height)="[^"]*"/g, '')
</script>

<template>
  <span class="inline-flex [&>svg]:size-full" v-html="svg" />
</template>
