// @ts-check
import pluginQuery from '@tanstack/eslint-plugin-query'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(...pluginQuery.configs['flat/recommended'], {
  files: ['**/*.js', '**/*.ts', '**/*.vue'],
  rules: {
    'vue/html-self-closing': ['warn', { html: { void: 'any' } }],
  },
})
