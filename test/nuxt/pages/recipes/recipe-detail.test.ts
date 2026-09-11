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

const { useRouteMock, wakeLock } = vi.hoisted(() => ({
  useRouteMock: vi.fn(() => ({ params: { id: 'r1' } })),
  wakeLock: { isSupported: { value: true }, request: vi.fn() },
}))

mockNuxtImport('useRoute', () => useRouteMock)
mockNuxtImport('useWakeLock', () => () => wakeLock)

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
  wakeLock.request.mockClear()
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

  it('names the image and title for a shared view transition with the recipe card', async () => {
    response = detail({ imageUrl: 'https://bucket.test/a.webp' })

    const component = await mountLoaded()

    expect(
      component.get(testId('recipe-detail-image')).attributes('style'),
    ).toContain('view-transition-name: recipe-image-r1')
    expect(component.get('h1').attributes('style')).toContain(
      'view-transition-name: recipe-title-r1',
    )
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

  it('keeps the screen awake once the recipe has loaded', async () => {
    await mountLoaded()

    expect(wakeLock.request).toHaveBeenCalledWith('screen')
  })

  it('hides the description when there is none', async () => {
    response = detail({ description: null })

    const component = await mountLoaded()

    expect(component.text()).not.toContain('Klassieke pastasaus')
  })

  it('hides the ingredients section when there are none', async () => {
    response = detail({ ingredients: [] })

    const component = await mountLoaded()

    expect(component.text()).not.toContain('Ingrediënten')
  })

  it('falls back to a default label when the source has no name', async () => {
    response = detail({ sourceName: null })

    const component = await mountLoaded()

    expect(component.text()).toContain('Bekijk het origineel')
  })

  it('shows tags when the recipe has them', async () => {
    response = detail({ tags: ['vega', 'snel'] })

    const component = await mountLoaded()

    expect(component.text()).toContain('vega')
    expect(component.text()).toContain('snel')
  })

  it('toggles an ingredient when checked and unchecked', async () => {
    const component = await mountLoaded()
    const checkbox = component.findAll(testId('ingredient-checkbox'))[0]!

    expect(checkbox.attributes('aria-checked')).toBe('false')

    await checkbox.trigger('click')
    expect(checkbox.attributes('aria-checked')).toBe('true')

    await checkbox.trigger('click')
    expect(checkbox.attributes('aria-checked')).toBe('false')
  })

  it('links back to the original source', async () => {
    const component = await mountLoaded()

    expect(component.html()).toContain(
      'https://www.leukerecepten.nl/recepten/x/',
    )
  })

  it('links the back button to the recipe list', async () => {
    const component = await mountLoaded()

    expect(component.get(testId('recipe-detail-back')).attributes('href')).toBe(
      '/',
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
