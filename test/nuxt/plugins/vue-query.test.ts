import { describe, expect, it, vi } from 'vitest'
import type { QueryClient } from '@tanstack/vue-query'
import plugin from '~/plugins/vue-query'

function createNuxt() {
  const hooks: Record<string, () => void> = {}

  return {
    vueApp: { use: vi.fn() },
    hooks: {
      hook: (name: string, cb: () => void) => {
        hooks[name] = cb
      },
    },
    run: (name: string) => hooks[name]?.(),
    registered: (name: string) => name in hooks,
  }
}

function install(nuxt: ReturnType<typeof createNuxt>) {
  const handler = plugin as unknown as {
    setup?: (nuxt: unknown) => unknown
  }

  return (handler.setup ?? (plugin as unknown as (n: unknown) => unknown))(nuxt)
}

describe('vue-query plugin', () => {
  it('installs the vue-query plugin on the app', () => {
    const nuxt = createNuxt()

    install(nuxt)

    expect(nuxt.vueApp.use).toHaveBeenCalledTimes(1)
  })

  it('configures a query client with the app defaults', () => {
    const nuxt = createNuxt()

    install(nuxt)

    const [, options] = nuxt.vueApp.use.mock.calls[0] as [
      unknown,
      { queryClient: QueryClient },
    ]
    const defaults = options.queryClient.getDefaultOptions()

    expect(defaults.queries).toMatchObject({ staleTime: 60_000, retry: 1 })
  })

  it('hooks rendering so server state can be handed to the client', () => {
    const nuxt = createNuxt()

    install(nuxt)

    expect(nuxt.registered('app:rendered')).toBe(import.meta.server)
  })

  it('shares one query client between install and hooks', () => {
    const nuxt = createNuxt()

    install(nuxt)
    install(nuxt)

    const [[, first], [, second]] = nuxt.vueApp.use.mock.calls as [
      [unknown, { queryClient: QueryClient }],
      [unknown, { queryClient: QueryClient }],
    ]

    expect(first.queryClient).not.toBe(second.queryClient)
  })
})
