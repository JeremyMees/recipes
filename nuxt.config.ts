const storageEndpoint = process.env.AWS_ENDPOINT_URL_S3

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils/module',
    'nuxt-auth-utils',
    '@vueuse/nuxt',
    '@nuxt/image',
  ],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? '',
    s3Endpoint: process.env.AWS_ENDPOINT_URL_S3 ?? '',
    familyEmails: '',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 30,
    },
  },

  image: {
    provider: 'ipx',
    quality: 80,
    domains: storageEndpoint ? [new URL(storageEndpoint).hostname] : [],
  },

  compatibilityDate: '2026-06-30',
})
