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
    session: {
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 30,
    },
    public: {
      sentryDsn: process.env.SENTRY_DSN ?? '',
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'The Wrap',
      short_name: 'Wrap',
      description: 'Family recipes app',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
  },

  sourcemap: {
    client: 'hidden',
    server: false,
  },
})
