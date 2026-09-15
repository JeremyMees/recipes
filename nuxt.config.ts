import pwa from './pwa.config'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-30',

  experimental: {
    viewTransition: true,
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils/module',
    'nuxt-auth-utils',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@sentry/nuxt/module',
  ],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? '',
    s3Endpoint: process.env.AWS_ENDPOINT_URL_S3 ?? '',
    familyEmails: '',
    anthropicApiKey: '',
    anthropicModel: '',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 30,
    },
    public: {
      sentryDsn: process.env.SENTRY_DSN ?? '',
    },
  },

  pwa,

  sourcemap: {
    client: 'hidden',
    server: false,
  },
})
