import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import RecipeDetailPage from '~/pages/recipes/[id]/index.vue'
import { detail } from '~~/test/fixtures/recipes'
import { testId } from '~~/test/unit/stubs/selectors'
import type { RecipeDetail } from '#shared/types/recipe'

const { useRouteMock } = vi.hoisted(() => ({
  useRouteMock: vi.fn(() => ({ params: { id: 'r1' } })),
}))

mockNuxtImport('useRoute', () => useRouteMock)

let response: RecipeDetail | undefined
let status: number

registerEndpoint('/api/recipes/r1', {
  method: 'GET',
  handler: () => {
    if (status !== 200) throw createError({ statusCode: status })

    return response
  },
})

beforeEach(() => {
  response = detail()
  status = 200
})

function mountPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })

  return mountSuspended(RecipeDetailPage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

async function mountLoaded() {
  const component = await mountPage()

  await vi.waitFor(() =>
    expect(component.text()).toContain('Spaghetti bolognese'),
  )

  return component
}

describe('recipe detail page', () => {
  it('shows the title', async () => {
    const component = await mountLoaded()

    expect(component.text()).toContain('Spaghetti bolognese')
  })

  it('lists the ingredients and the steps', async () => {
    const component = await mountLoaded()

    expect(component.text()).toContain('500 gr gehakt')
    expect(component.text()).toContain('Bak het gehakt.')
  })

  it('shows the image when there is one', async () => {
    response = detail({ imageUrl: 'https://bucket.test/a.webp' })

    const component = await mountLoaded()

    expect(component.find(testId('recipe-detail-image')).exists()).toBe(true)
  })

  it('leaves out the image when there is none', async () => {
    const component = await mountLoaded()

    expect(component.find(testId('recipe-detail-image')).exists()).toBe(false)
  })

  it('offers deleting for your own recipe', async () => {
    const component = await mountLoaded()

    expect(component.text()).toContain('Verwijderen')
  })

  it('hides the edit controls on someone elses recipe', async () => {
    response = detail({ canEdit: false, authorName: 'Mama' })

    const component = await mountLoaded()

    expect(component.text()).not.toContain('Verwijderen')
  })

  it('credits the author only when the recipe is not yours', async () => {
    response = detail({ canEdit: false, authorName: 'Mama' })

    const component = await mountLoaded()

    expect(component.text()).toContain('Mama')
  })

  it('shows notes when the recipe has them', async () => {
    response = detail({ notes: 'Volgende keer minder zout.' })

    const component = await mountLoaded()

    expect(component.text()).toContain('Volgende keer minder zout.')
  })

  it('links back to the original source', async () => {
    const component = await mountLoaded()

    expect(component.html()).toContain(
      'https://www.leukerecepten.nl/recepten/x/',
    )
  })

  it('explains when the recipe cannot be loaded', async () => {
    status = 404

    const component = await mountPage()

    await vi.waitFor(() =>
      expect(component.text()).toContain('kon niet worden geladen'),
    )
  })
})
