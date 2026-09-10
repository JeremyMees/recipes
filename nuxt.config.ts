export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/test-utils/module'],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true },
  },

  compatibilityDate: '2026-06-30',
})
