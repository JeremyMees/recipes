import type { ModuleOptions } from '@vite-pwa/nuxt'

export default {
  registerType: 'autoUpdate',
  pwaAssets: {
    config: true,
    overrideManifestIcons: false,
  },
  manifest: {
    id: '/',
    name: 'Familierecepten',
    short_name: 'Taco',
    description: 'Family recipes app',
    lang: 'nl',
    start_url: '/',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    share_target: {
      action: '/recipes/new',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    icons: [
      {
        src: '/pwa-64x64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/monochrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'monochrome',
      },
    ],
  },
} satisfies ModuleOptions
