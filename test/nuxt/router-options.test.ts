import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import options from '~/router.options'

const scrollBehavior = options.scrollBehavior!

function route(path: string, hash = ''): RouteLocationNormalized {
  return { path, hash, fullPath: path + hash } as RouteLocationNormalized
}

function restore(top: number) {
  return scrollBehavior(route('/'), route('/recipes/r1'), {
    top,
    left: 0,
  }) as Promise<unknown>
}

let height = 0

beforeEach(() => {
  height = 0

  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(
    () => height,
  )
  vi.stubGlobal('innerHeight', 800)
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    queueMicrotask(callback)

    return 0
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('scrollBehavior', () => {
  it('waits for the list to grow back before restoring the saved position', async () => {
    const pending = restore(2400)
    const settled = vi.fn()

    pending.then(settled)

    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    height = 3600

    await expect(pending).resolves.toEqual({ top: 2400, left: 0 })
  })

  it('restores straight away when the page is already tall enough', async () => {
    height = 5000

    await expect(restore(1200)).resolves.toEqual({ top: 1200, left: 0 })
  })

  it('gives up waiting instead of hanging when the page never grows', async () => {
    let now = 0

    vi.spyOn(performance, 'now').mockImplementation(() => (now += 100))

    await expect(restore(9000)).resolves.toEqual({ top: 9000, left: 0 })
  })

  it('scrolls to an anchor when the route carries a hash', async () => {
    await expect(
      scrollBehavior(route('/', '#steps'), route('/'), null),
    ).resolves.toEqual({ el: '#steps', top: 80, behavior: 'smooth' })
  })

  it('stays put when only the query changed', async () => {
    await expect(scrollBehavior(route('/'), route('/'), null)).resolves.toBe(
      false,
    )
  })

  it('starts a new page at the top', async () => {
    await expect(
      scrollBehavior(route('/family'), route('/'), null),
    ).resolves.toEqual({ top: 0 })
  })
})
