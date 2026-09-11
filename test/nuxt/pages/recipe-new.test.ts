import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { readBody } from 'h3'
import NewRecipePage from '~/pages/recipes/new.vue'
import type { RecipeDraftSource } from '#shared/types/recipe'
import { testId } from '~~/test/unit/stubs/selectors'

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateToMock)

let importResponse: {
  source: RecipeDraftSource
  draft: Record<string, unknown>
}

const createdBodies: unknown[] = []

registerEndpoint('/api/recipes/import', {
  method: 'POST',
  handler: () => importResponse,
})

registerEndpoint('/api/recipes', {
  method: 'POST',
  handler: async event => {
    createdBodies.push(await readBody(event))

    return { id: 'saved-1' }
  },
})

function emptyDraft(overrides: Record<string, unknown> = {}) {
  return {
    title: '',
    description: null,
    imageKey: null,
    imageUrl: null,
    sourceUrl: 'https://www.leukerecepten.nl/recepten/x/',
    sourceName: 'leukerecepten.nl',
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [],
    instructions: [],
    tags: [],
    notes: null,
    ...overrides,
  }
}

function mountPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })

  return mountSuspended(NewRecipePage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

async function importUrl(
  component: Awaited<ReturnType<typeof mountPage>>,
  url = 'https://www.leukerecepten.nl/recepten/x/',
) {
  await component.get(testId('import-url')).setValue(url)
  await component.get(testId('import-form')).trigger('submit')
}

describe('add recipe page', () => {
  beforeEach(() => {
    navigateToMock.mockClear()
    createdBodies.length = 0
    importResponse = { source: 'jsonld', draft: emptyDraft() }
  })

  it('shows no import feedback before anything is imported', async () => {
    const component = await mountPage()

    expect(component.find(testId('import-message')).exists()).toBe(false)
  })

  it('disables the import button until a url is typed', async () => {
    const component = await mountPage()

    expect(
      component.get(testId('import-submit')).attributes('disabled'),
    ).toBeDefined()

    await component.get(testId('import-url')).setValue('https://x.test/r')

    expect(
      component.get(testId('import-submit')).attributes('disabled'),
    ).toBeUndefined()
  })

  it('fills the form from a fully parsed recipe', async () => {
    importResponse = {
      source: 'jsonld',
      draft: emptyDraft({
        title: 'Spaghetti bolognese',
        ingredients: ['125 gr spek', '1 ui'],
        instructions: ['Bak de spekjes'],
      }),
    }

    const component = await mountPage()

    await importUrl(component)

    await vi.waitFor(() =>
      expect(
        (component.get(testId('recipe-form-title')).element as HTMLInputElement)
          .value,
      ).toBe('Spaghetti bolognese'),
    )

    expect(component.findAll(testId('list-row')).length).toBeGreaterThan(0)
    expect(component.get(testId('import-message')).text()).toContain(
      'Recept ingelezen',
    )
  })

  it('warns when only open graph data came back', async () => {
    importResponse = {
      source: 'opengraph',
      draft: emptyDraft({ title: 'Half recept' }),
    }

    const component = await mountPage()

    await importUrl(component)

    await vi.waitFor(() =>
      expect(component.get(testId('import-message')).text()).toContain(
        'Gedeeltelijk ingelezen',
      ),
    )
  })

  it('keeps the source url so a blocked site can be filled in by hand', async () => {
    importResponse = {
      source: 'unreachable',
      draft: emptyDraft({
        sourceUrl: 'https://www.allrecipes.com/recipe/158140/',
      }),
    }

    const component = await mountPage()

    await importUrl(component, 'https://www.allrecipes.com/recipe/158140/')

    await vi.waitFor(() =>
      expect(component.get(testId('import-message')).text()).toContain(
        'Automatisch inlezen lukte niet',
      ),
    )

    expect(component.html()).toContain(
      'https://www.allrecipes.com/recipe/158140/',
    )
  })

  it('saves the reviewed recipe and goes to its page', async () => {
    importResponse = {
      source: 'jsonld',
      draft: emptyDraft({ title: 'Spaghetti bolognese' }),
    }

    const component = await mountPage()

    await importUrl(component)

    await vi.waitFor(() =>
      expect(
        (component.get(testId('recipe-form-title')).element as HTMLInputElement)
          .value,
      ).toBe('Spaghetti bolognese'),
    )

    await component.get(testId('recipe-form')).trigger('submit')

    await vi.waitFor(() => expect(createdBodies).toHaveLength(1))

    expect(createdBodies[0]).toMatchObject({
      title: 'Spaghetti bolognese',
      sourceName: 'leukerecepten.nl',
    })
    expect(navigateToMock).toHaveBeenCalledWith('/recipes/saved-1')
  })

  it('refuses to save without a title', async () => {
    const component = await mountPage()

    await component.get(testId('recipe-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(component.text()).toContain('Geef het recept een naam'),
    )

    expect(createdBodies).toHaveLength(0)
  })
})
