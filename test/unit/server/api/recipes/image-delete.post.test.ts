import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { RECIPE_IMAGE_KEY } from '~~/test/fixtures/recipes'

const { deleteRecipeImage, isRecipeImageKeyInUse } = vi.hoisted(() => ({
  deleteRecipeImage: vi.fn(),
  isRecipeImageKeyInUse: vi.fn(),
}))

vi.mock('~~/server/utils/storage', () => ({ deleteRecipeImage }))
vi.mock('~~/server/utils/recipes', () => ({ isRecipeImageKeyInUse }))

const handler = (await import('~~/server/api/recipes/image-delete.post'))
  .default

const event = (body: unknown = { key: RECIPE_IMAGE_KEY }) =>
  mockEvent({ method: 'POST', body })

beforeEach(() => {
  resetSession({ id: 'u1' })
  deleteRecipeImage.mockResolvedValue(undefined)
  isRecipeImageKeyInUse.mockResolvedValue(false)
})

describe('POST /api/recipes/image-delete', () => {
  it('discards an image nothing references', async () => {
    await expect(handler(event())).resolves.toEqual({ key: RECIPE_IMAGE_KEY })
    expect(deleteRecipeImage).toHaveBeenCalledWith(RECIPE_IMAGE_KEY)
  })

  it('refuses to delete an image a recipe still points at', async () => {
    isRecipeImageKeyInUse.mockResolvedValue(true)

    await expect(handler(event())).rejects.toMatchObject({ statusCode: 409 })
    expect(deleteRecipeImage).not.toHaveBeenCalled()
  })

  it('rejects a key outside the recipes prefix', async () => {
    await expect(
      handler(
        event({ key: 'other/00000000-0000-0000-0000-000000000000.webp' }),
      ),
    ).rejects.toThrow()
    expect(deleteRecipeImage).not.toHaveBeenCalled()
  })

  it('rejects a traversal attempt', async () => {
    await expect(
      handler(event({ key: 'recipes/../secret.webp' })),
    ).rejects.toThrow()
    expect(deleteRecipeImage).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event())).rejects.toThrow('Unauthorized')
    expect(deleteRecipeImage).not.toHaveBeenCalled()
  })
})
