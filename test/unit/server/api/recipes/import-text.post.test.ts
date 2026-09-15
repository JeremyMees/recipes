import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { RECIPE_IMAGE_KEY, parsed } from '~~/test/fixtures/recipes'

const mocks = vi.hoisted(() => ({
  textToRecipeDraft: vi.fn(),
  fetchRemoteImage: vi.fn(),
  putRecipeImage: vi.fn(),
  recipeImageUrl: vi.fn(),
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

const handler = (await import('~~/server/api/recipes/import-text.post')).default

const CAPTION =
  'Spaghetti bolognese 🍝\n\n500 g gehakt\n1 ui\n\nBak het gehakt.'

const event = (body: unknown = { text: CAPTION }) =>
  mockEvent({ method: 'POST', body })

beforeEach(() => {
  resetSession({ id: 'u1' })
  mocks.textToRecipeDraft.mockResolvedValue(parsed())
  mocks.fetchRemoteImage.mockResolvedValue(undefined)
  mocks.putRecipeImage.mockResolvedValue(RECIPE_IMAGE_KEY)
  mocks.recipeImageUrl.mockReturnValue(
    `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
  )
})

describe('POST /api/recipes/import-text', () => {
  it('turns pasted text into a draft', async () => {
    const result = await handler(event())

    expect(mocks.textToRecipeDraft).toHaveBeenCalledWith(CAPTION, null)
    expect(result.source).toBe('ai')
    expect(result.draft.title).toBe('Spaghetti bolognese')
  })

  it('keeps the social link as the source', async () => {
    const url = 'https://www.instagram.com/p/abc/'

    await handler(event({ text: CAPTION, sourceUrl: url }))

    expect(mocks.textToRecipeDraft).toHaveBeenCalledWith(CAPTION, url)
  })

  it('reports when no recipe could be found', async () => {
    mocks.textToRecipeDraft.mockResolvedValue(undefined)

    const result = await handler(
      event({ text: 'gewoon een foto van mijn kat' }),
    )

    expect(result.source).toBe('none')
    expect(result.draft.title).toBe('')
    expect(result.draft.sourceUrl).toBeNull()
  })

  it('rejects blank text', async () => {
    await expect(handler(event({ text: '   ' }))).rejects.toThrow()
    expect(mocks.textToRecipeDraft).not.toHaveBeenCalled()
  })

  it('rejects text over the cap', async () => {
    await expect(handler(event({ text: 'a'.repeat(20_001) }))).rejects.toThrow()
    expect(mocks.textToRecipeDraft).not.toHaveBeenCalled()
  })

  it('rejects a source url that is not http', async () => {
    await expect(
      handler(event({ text: CAPTION, sourceUrl: 'file:///etc/passwd' })),
    ).rejects.toThrow()
    expect(mocks.textToRecipeDraft).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event())).rejects.toThrow('Unauthorized')
    expect(mocks.textToRecipeDraft).not.toHaveBeenCalled()
  })
})
