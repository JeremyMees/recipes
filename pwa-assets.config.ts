import { readFile } from 'node:fs/promises'
import {
  combinePresetAndAppleSplashScreens,
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

const SOURCE_IMAGE = new URL('./public/logo.svg', import.meta.url)
const LIGHT_BG = '#ffffff'
const DARK_BG = '#1d161e'
const DARK_INK = '#ffffff'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      maskable: { sizes: [512], padding: 0.35 },
    },
    createAppleSplashScreens({
      padding: 0.6,
      resizeOptions: { background: LIGHT_BG, fit: 'contain' },
      darkResizeOptions: { background: DARK_BG, fit: 'contain' },
      linkMediaOptions: { addMediaScreen: true, basePath: '/', xhtml: false },
      darkImageResolver: async () => {
        const svg = await readFile(SOURCE_IMAGE, 'utf8')
        return Buffer.from(svg.replaceAll('currentColor', DARK_INK))
      },
    }),
  ),
  images: ['public/logo.svg'],
})
