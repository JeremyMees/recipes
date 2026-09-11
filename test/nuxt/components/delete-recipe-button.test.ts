import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import DeleteRecipeButton from '~/components/delete-recipe-button.vue'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateToMock)

let deleteStatus: number
let deleted: string[]

registerEndpoint('/api/recipes/r1', {
  method: 'DELETE',
  handler: () => {
    if (deleteStatus !== 200) {
      throw createError({ statusCode: deleteStatus })
    }

    deleted.push('r1')

    return { id: 'r1' }
  },
})

beforeEach(() => {
  deleteStatus = 200
  deleted = []
  navigateToMock.mockReset()
})

function mount() {
  return mountSuspended(DeleteRecipeButton, {
    props: { id: 'r1', title: 'Spaghetti bolognese' },
    global: {
      plugins: [
        [
          VueQueryPlugin,
          {
            queryClient: new QueryClient({
              defaultOptions: { mutations: { retry: false } },
            }),
          },
        ],
      ],
    },
  })
}

async function openAndConfirm(component: Awaited<ReturnType<typeof mount>>) {
  await component.get('button').trigger('click')
  await expect.poll(() => confirmButtons().length).toBeGreaterThan(0)

  confirmButtons().at(-1)!.click()
}

function confirmButtons(): HTMLButtonElement[] {
  return [...document.body.querySelectorAll('button')].filter(
    button => button.textContent?.trim() === 'Verwijderen',
  ) as HTMLButtonElement[]
}

describe('DeleteRecipeButton', () => {
  it('does not delete anything until it is confirmed', async () => {
    await mount()

    expect(deleted).toEqual([])
  })

  it('deletes the recipe once confirmed', async () => {
    const component = await mount()

    await openAndConfirm(component)
    await expect.poll(() => deleted.length).toBeGreaterThan(0)

    expect(deleted).toEqual(['r1'])
  })

  it('returns to the overview after deleting', async () => {
    const component = await mount()

    await openAndConfirm(component)
    await expect.poll(() => navigateToMock.mock.calls.length).toBeGreaterThan(0)

    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('stays put when the delete fails', async () => {
    deleteStatus = 500

    const component = await mount()

    await openAndConfirm(component)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
