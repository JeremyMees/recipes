import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  preview: {
    buckets: {
      'recipes-images': { access: 'public_read' },
    },
  },
})
