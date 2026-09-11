import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { RECIPE_IMAGE_KEY } from '~~/test/fixtures/recipes'

const storage = vi.hoisted(() => ({
  recipeImageKey: vi.fn(),
  recipeImageUrl: vi.fn(),
  presignRecipeImageUpload: vi.fn(),
  uploadHeaders: vi.fn(),
}))

vi.mock('~~/server/utils/storage', () => storage)

const handler = (await import('~~/server/api/recipes/image-upload.post'))
  .default

const event = (body: unknown = { contentType: 'image/webp' }) =>
  mockEvent({ method: 'POST', body })

beforeEach(() => {
  resetSession({ id: 'u1' })
  storage.recipeImageKey.mockReturnValue(RECIPE_IMAGE_KEY)
  storage.recipeImageUrl.mockReturnValue(
    `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
  )
  storage.presignRecipeImageUpload.mockResolvedValue('https://signed.test/put')
  storage.uploadHeaders.mockReturnValue({ 'content-type': 'image/webp' })
})

describe('POST /api/recipes/image-upload', () => {
  it('issues a ticket for a direct browser upload', async () => {
    await expect(handler(event())).resolves.toEqual({
      key: RECIPE_IMAGE_KEY,
      url: `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
      uploadUrl: 'https://signed.test/put',
      headers: { 'content-type': 'image/webp' },
    })
  })

  it('signs the same key it hands back', async () => {
    await handler(event())

    expect(storage.presignRecipeImageUpload).toHaveBeenCalledWith(
      RECIPE_IMAGE_KEY,
      'image/webp',
    )
  })

  it('only issues tickets for webp, since the browser encodes it', async () => {
    await expect(
      handler(event({ contentType: 'image/jpeg' })),
    ).rejects.toThrow()
    expect(storage.presignRecipeImageUpload).not.toHaveBeenCalled()
  })

  it('is a 503 when object storage is not configured', async () => {
    storage.recipeImageUrl.mockReturnValue(null)

    await expect(handler(event())).rejects.toMatchObject({ statusCode: 503 })
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event())).rejects.toThrow('Unauthorized')
    expect(storage.recipeImageKey).not.toHaveBeenCalled()
  })
})
