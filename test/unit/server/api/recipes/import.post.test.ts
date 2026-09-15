import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { RECIPE_IMAGE_KEY, parsed } from '~~/test/fixtures/recipes'

const mocks = vi.hoisted(() => ({
  fetchPageHtml: vi.fn(),
  htmlToRecipeDraft: vi.fn(),
  textToRecipeDraft: vi.fn(),
  fetchRemoteImage: vi.fn(),
  putRecipeImage: vi.fn(),
  recipeImageUrl: vi.fn(),
}))

vi.mock('~~/server/utils/fetch-page', () => ({
  fetchPageHtml: mocks.fetchPageHtml,
}))
vi.mock('~~/server/utils/recipe-parser', async importOriginal => ({
  ...(await importOriginal<object>()),
  htmlToRecipeDraft: mocks.htmlToRecipeDraft,
}))
vi.mock('~~/server/utils/recipe-ai', () => ({
  textToRecipeDraft: mocks.textToRecipeDraft,
}))
vi.mock('~~/server/utils/fetch-image', () => ({
  fetchRemoteImage: mocks.fetchRemoteImage,
}))
vi.mock('~~/server/utils/storage', () => ({
  putRecipeImage: mocks.putRecipeImage,
  recipeImageUrl: mocks.recipeImageUrl,
}))

const handler = (await import('~~/server/api/recipes/import.post')).default

const SOURCE = 'https://www.leukerecepten.nl/recepten/x/'

const event = (body: unknown = { url: SOURCE }) =>
  mockEvent({ method: 'POST', body })

beforeEach(() => {
  resetSession({ id: 'u1' })
  mocks.fetchPageHtml.mockResolvedValue('<html></html>')
  mocks.htmlToRecipeDraft.mockReturnValue({ draft: parsed(), source: 'jsonld' })
  mocks.textToRecipeDraft.mockResolvedValue(undefined)
  mocks.fetchRemoteImage.mockResolvedValue(undefined)
  mocks.putRecipeImage.mockResolvedValue(RECIPE_IMAGE_KEY)
  mocks.recipeImageUrl.mockReturnValue(
    `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
  )
})

describe('POST /api/recipes/import', () => {
  it('returns the parsed draft', async () => {
    const result = await handler(event())

    expect(result.source).toBe('jsonld')
    expect(result.draft).toMatchObject({
      title: 'Spaghetti bolognese',
      sourceUrl: SOURCE,
    })
  })

  it('never exposes the remote image url on the draft', async () => {
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({ imageUrl: 'https://cdn.test/a.jpg' }),
      source: 'jsonld',
    })

    const result = await handler(event())

    expect(result.draft).not.toHaveProperty('imageKey', undefined)
    expect(result.draft.imageUrl).toBeNull()
  })

  it('copies a scraped image into the bucket', async () => {
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({ imageUrl: 'https://cdn.test/a.jpg' }),
      source: 'jsonld',
    })
    mocks.fetchRemoteImage.mockResolvedValue({
      body: new Uint8Array([1]),
      contentType: 'image/jpeg',
    })

    const result = await handler(event())

    expect(mocks.fetchRemoteImage).toHaveBeenCalledWith(
      'https://cdn.test/a.jpg',
    )
    expect(result.draft.imageKey).toBe(RECIPE_IMAGE_KEY)
    expect(result.draft.imageUrl).toBe(
      `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
    )
  })

  it('keeps the recipe when the image cannot be stored', async () => {
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({ imageUrl: 'https://cdn.test/a.jpg' }),
      source: 'jsonld',
    })
    mocks.fetchRemoteImage.mockResolvedValue({
      body: new Uint8Array([1]),
      contentType: 'image/jpeg',
    })
    mocks.putRecipeImage.mockRejectedValue(new Error('bucket down'))

    const result = await handler(event())

    expect(result.draft.imageKey).toBeNull()
    expect(result.draft.title).toBe('Spaghetti bolognese')
  })

  it('reports a page it could not reach and still keeps the link', async () => {
    mocks.fetchPageHtml.mockResolvedValue(undefined)
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({ title: '' }),
      source: 'none',
    })

    const result = await handler(event())

    expect(result.source).toBe('unreachable')
    expect(result.draft.sourceUrl).toBe(SOURCE)
  })

  it('does not fetch social links and tells the caller to paste instead', async () => {
    const result = await handler(
      event({ url: 'https://www.instagram.com/p/abc/' }),
    )

    expect(result.source).toBe('social')
    expect(result.draft.sourceUrl).toBe('https://www.instagram.com/p/abc/')
    expect(mocks.fetchPageHtml).not.toHaveBeenCalled()
    expect(mocks.textToRecipeDraft).not.toHaveBeenCalled()
  })

  it('skips the model when the page already yielded ingredients', async () => {
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({ ingredients: ['500 g gehakt'] }),
      source: 'jsonld',
    })

    const result = await handler(event())

    expect(result.source).toBe('jsonld')
    expect(mocks.textToRecipeDraft).not.toHaveBeenCalled()
  })

  it('rescues a page with no recipe markup through the model', async () => {
    mocks.fetchPageHtml.mockResolvedValue(
      '<html><body><h1>Stoofvlees</h1><p>1 kg vlees</p></body></html>',
    )
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({
        title: 'Stoofvlees',
        imageUrl: 'https://cdn.test/a.jpg',
      }),
      source: 'opengraph',
    })
    mocks.textToRecipeDraft.mockResolvedValue(
      parsed({ title: 'Stoofvlees', ingredients: ['1 kg vlees'] }),
    )

    const result = await handler(event())

    expect(mocks.textToRecipeDraft).toHaveBeenCalledWith(
      'Stoofvlees\n1 kg vlees',
      SOURCE,
    )
    expect(result.source).toBe('ai')
    expect(result.draft.ingredients).toEqual(['1 kg vlees'])
    expect(mocks.fetchRemoteImage).toHaveBeenCalledWith(
      'https://cdn.test/a.jpg',
    )
  })

  it('keeps the partial draft when the model finds nothing either', async () => {
    mocks.htmlToRecipeDraft.mockReturnValue({
      draft: parsed({ title: 'Stoofvlees' }),
      source: 'opengraph',
    })
    mocks.textToRecipeDraft.mockResolvedValue(undefined)

    const result = await handler(event())

    expect(result.source).toBe('opengraph')
    expect(result.draft.title).toBe('Stoofvlees')
  })

  it('rejects a url that is not http', async () => {
    await expect(
      handler(event({ url: 'file:///etc/passwd' })),
    ).rejects.toThrow()
    expect(mocks.fetchPageHtml).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event())).rejects.toThrow('Unauthorized')
    expect(mocks.fetchPageHtml).not.toHaveBeenCalled()
  })
})
