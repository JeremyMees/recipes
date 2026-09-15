import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { defineNuxtModule, createResolver } from 'nuxt/kit'

const SIZE = 512
const SAFE_ZONE_SCALE = 0.62

export default defineNuxtModule({
  meta: { name: 'monochrome-icon' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(nuxt.options.rootDir)
    const source = resolve('public/logo.svg')
    const target = resolve(`public/monochrome-${SIZE}x${SIZE}.png`)

    nuxt.hook('build:before', async () => {
      const require = createRequire(
        import.meta.resolve('@vite-pwa/assets-generator/package.json'),
      )
      const sharp = require('sharp')

      const logo = await readFile(source, 'utf8')
      const viewBox = logo.match(/viewBox="([^"]+)"/)?.[1]
      const path = logo.match(/<path fill="currentColor" d="([^"]+)"/)?.[1]

      if (!viewBox || !path) {
        throw new Error(`Could not read the logo path from ${source}`)
      }

      const offset = ((1 - SAFE_ZONE_SCALE) / 2) * 100
      const padded = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 100 100"><g transform="translate(${offset} ${offset}) scale(${SAFE_ZONE_SCALE})"><svg width="100" height="100" viewBox="${viewBox}"><path fill="#000" d="${path}"/></svg></g></svg>`

      await writeFile(target, await sharp(Buffer.from(padded)).png().toBuffer())
    })
  },
})
