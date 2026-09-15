import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import {
  createCanvasStub,
  spyOnCanvasElement,
  stubImageBitmap,
  type CanvasStub,
} from '~~/test/unit/stubs/canvas'
import { RECIPE_IMAGE_KEY as NEW_KEY } from '~~/test/fixtures/recipes'

const IMPORTED_KEY = 'recipes/22222222-2222-2222-2222-222222222222.jpg'
const IMPORTED_URL = `https://bucket.test/recipes-images/${IMPORTED_KEY}`

let canvas: CanvasStub
let deleteBodies: unknown[]
let sourceStatus: number
let createStatus: number
let importStatus: number

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateToMock)

let importResponse: {
  source: RecipeDraftSource
  draft: Record<string, unknown>
}

let textResponse: {
  source: RecipeDraftSource
  draft: Record<string, unknown>
}

const textBodies: unknown[] = []

const createdBodies: unknown[] = []

registerEndpoint('/api/recipes/import', {
  method: 'POST',
  handler: () => {
    if (importStatus !== 200) throw createError({ statusCode: importStatus })

    return importResponse
  },
})

registerEndpoint('/api/recipes/import-text', {
  method: 'POST',
  handler: async event => {
    textBodies.push(await readBody(event))

    return textResponse
  },
})

registerEndpoint('/api/recipes', {
  method: 'POST',
  handler: async event => {
    createdBodies.push(await readBody(event))

    if (createStatus !== 200) throw createError({ statusCode: createStatus })

    return { id: 'saved-1' }
  },
})

registerEndpoint('/api/recipes/image-upload', {
  method: 'POST',
  handler: () => ({
    key: NEW_KEY,
    url: `https://bucket.test/recipes-images/${NEW_KEY}`,
    uploadUrl: `https://bucket.test/signed/${NEW_KEY}`,
    headers: { 'content-type': 'image/webp' },
  }),
})

registerEndpoint('/api/recipes/image-delete', {
  method: 'POST',
  handler: async event => {
    deleteBodies.push(await readBody(event))

    return { key: IMPORTED_KEY }
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

function mountPage(route = '/recipes/new') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })

  return mountSuspended(NewRecipePage, {
    route,
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
    deleteBodies = []
    sourceStatus = 200
    createStatus = 200
    importStatus = 200
    importResponse = { source: 'jsonld', draft: emptyDraft() }
    textResponse = { source: 'ai', draft: emptyDraft() }
    textBodies.length = 0

    canvas = createCanvasStub()

    stubImageBitmap(canvas, 3000, 2000)
    spyOnCanvasElement(canvas)

    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response(null, { status: 200 })

      return new Response(
        sourceStatus === 200
          ? new Blob(['stored'], { type: 'image/jpeg' })
          : null,
        { status: sourceStatus },
      )
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

  it('replaces an imported image with a resized webp before saving', async () => {
    importResponse = {
      source: 'jsonld',
      draft: emptyDraft({
        title: 'Spaghetti bolognese',
        imageKey: IMPORTED_KEY,
        imageUrl: IMPORTED_URL,
      }),
    }

    const component = await mountPage()

    await importUrl(component)

    await vi.waitFor(() => expect(deleteBodies).toHaveLength(1))

    expect(canvas.drawn).toEqual([{ width: 1200, height: 800 }])
    expect(deleteBodies).toEqual([{ key: IMPORTED_KEY }])

    await component.get(testId('recipe-form')).trigger('submit')

    await vi.waitFor(() => expect(createdBodies).toHaveLength(1))

    expect(createdBodies[0]).toMatchObject({ imageKey: NEW_KEY })
  })

  it('shows the replacement in the form preview', async () => {
    importResponse = {
      source: 'jsonld',
      draft: emptyDraft({
        title: 'Spaghetti bolognese',
        imageKey: IMPORTED_KEY,
        imageUrl: IMPORTED_URL,
      }),
    }

    const component = await mountPage()

    await importUrl(component)

    await vi.waitFor(() =>
      expect(component.get(testId('recipe-form-image')).attributes('src')).toBe(
        `https://bucket.test/recipes-images/${NEW_KEY}`,
      ),
    )
  })

  it('keeps the imported image when it cannot be re-encoded', async () => {
    sourceStatus = 404
    importResponse = {
      source: 'jsonld',
      draft: emptyDraft({
        title: 'Spaghetti bolognese',
        imageKey: IMPORTED_KEY,
        imageUrl: IMPORTED_URL,
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

    await component.get(testId('recipe-form')).trigger('submit')

    await vi.waitFor(() => expect(createdBodies).toHaveLength(1))

    expect(createdBodies[0]).toMatchObject({ imageKey: IMPORTED_KEY })
    expect(deleteBodies).toHaveLength(0)
  })

  it('does not try to re-encode an import that came without an image', async () => {
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

    expect(canvas.drawn).toHaveLength(0)
    expect(deleteBodies).toHaveLength(0)
  })

  it('stays on the form when saving fails', async () => {
    createStatus = 500
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

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(component.find(testId('recipe-form')).exists()).toBe(true)
  })

  it('leaves the form usable when the link cannot be read', async () => {
    importStatus = 500

    const component = await mountPage()

    await importUrl(component)

    await vi.waitFor(() =>
      expect(component.find(testId('import-message')).exists()).toBe(false),
    )

    expect(component.find(testId('recipe-form')).exists()).toBe(true)
    expect(createdBodies).toHaveLength(0)
  })

  it('tells you to paste the caption for an instagram link', async () => {
    importResponse = {
      source: 'social',
      draft: emptyDraft({ sourceUrl: 'https://www.instagram.com/p/abc/' }),
    }

    const component = await mountPage()

    await importUrl(component, 'https://www.instagram.com/p/abc/')

    await vi.waitFor(() =>
      expect(component.get(testId('import-message')).text()).toContain(
        'Instagram en Facebook geven het recept niet vrij',
      ),
    )

    expect(component.find(testId('import-text')).exists()).toBe(true)
  })

  it('builds a recipe from a pasted caption', async () => {
    textResponse = {
      source: 'ai',
      draft: emptyDraft({
        title: 'Pasta pesto',
        sourceUrl: null,
        sourceName: null,
        ingredients: ['200 g spaghetti'],
      }),
    }

    const component = await mountPage(
      '/recipes/new?text=Pasta%20pesto%20recept',
    )

    expect(
      (component.get(testId('import-text')).element as HTMLTextAreaElement)
        .value,
    ).toBe('Pasta pesto recept')

    await component.get(testId('import-text-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(
        (component.get(testId('recipe-form-title')).element as HTMLInputElement)
          .value,
      ).toBe('Pasta pesto'),
    )

    expect(textBodies[0]).toMatchObject({
      text: 'Pasta pesto recept',
      sourceUrl: null,
    })
    expect(component.get(testId('import-message')).text()).toContain(
      'Recept uit tekst gehaald',
    )
  })

  it('keeps a shared link as the source of a pasted caption', async () => {
    const component = await mountPage(
      '/recipes/new?url=https%3A%2F%2Fwww.instagram.com%2Fp%2Fabc%2F&text=500%20g%20gehakt',
    )

    await component.get(testId('import-text-form')).trigger('submit')

    await vi.waitFor(() => expect(textBodies).toHaveLength(1))

    expect(textBodies[0]).toMatchObject({
      text: '500 g gehakt',
      sourceUrl: 'https://www.instagram.com/p/abc/',
    })
  })

  it('puts a shared bare link in the link field', async () => {
    const component = await mountPage(
      '/recipes/new?text=https%3A%2F%2Fwww.leukerecepten.nl%2Fr%2F',
    )

    expect(
      (component.get(testId('import-url')).element as HTMLInputElement).value,
    ).toBe('https://www.leukerecepten.nl/r/')
    expect(component.find(testId('import-text')).exists()).toBe(false)
  })

  it('leaves the form usable when no recipe is found in the text', async () => {
    textResponse = { source: 'none', draft: emptyDraft({ sourceUrl: null }) }

    const component = await mountPage('/recipes/new?text=foto%20van%20de%20kat')

    await component.get(testId('import-text-form')).trigger('submit')

    await vi.waitFor(() => expect(textBodies).toHaveLength(1))

    expect(component.find(testId('import-message')).exists()).toBe(false)
    expect(component.find(testId('recipe-form')).exists()).toBe(true)
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
