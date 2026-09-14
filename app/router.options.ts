import type { RouterConfig } from '@nuxt/schema'

const RESTORE_TIMEOUT = 1500

function waitForHeight(top: number): Promise<void> {
  return new Promise(resolve => {
    const deadline = performance.now() + RESTORE_TIMEOUT

    function check() {
      const reachable =
        document.documentElement.scrollHeight - window.innerHeight >= top

      if (reachable || performance.now() > deadline) {
        resolve()

        return
      }

      requestAnimationFrame(check)
    }

    requestAnimationFrame(check)
  })
}

export default {
  scrollBehavior: async (to, from, savedPosition) => {
    if (savedPosition) {
      await waitForHeight(savedPosition.top)

      return savedPosition
    }

    if (to.hash) return { el: to.hash, top: 80, behavior: 'smooth' }

    if (to.path === from.path) return false

    return { top: 0 }
  },
} satisfies RouterConfig
