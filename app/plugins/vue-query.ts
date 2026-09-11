import {
  QueryClient,
  VueQueryPlugin,
  dehydrate,
  hydrate,
} from '@tanstack/vue-query'
import type {
  DehydratedState,
  VueQueryPluginOptions,
} from '@tanstack/vue-query'

export default defineNuxtPlugin(nuxt => {
  const state = useState<DehydratedState | null>('vue-query', () => null)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  })

  const options: VueQueryPluginOptions = { queryClient }

  nuxt.vueApp.use(VueQueryPlugin, options)

  if (import.meta.server) {
    nuxt.hooks.hook('app:rendered', () => {
      state.value = dehydrate(queryClient)
    })
  }

  if (import.meta.client && state.value) {
    hydrate(queryClient, state.value)
  }
})
