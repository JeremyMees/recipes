import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { RECIPE_IMAGE_KEY } from '~~/test/fixtures/recipes'

const { updateOwnRecipe } = vi.hoisted(() => ({ updateOwnRecipe: vi.fn() }))

vi.mock('~~/server/utils/recipes', () => ({ updateOwnRecipe }))

const handler = (await import('~~/server/api/recipes/[id].patch')).default

const event = (body: unknown) =>
  mockEvent({ method: 'PATCH', params: { id: 'r1' }, body })

beforeEach(() => {
  resetSession({ id: 'u1' })
  updateOwnRecipe.mockResolvedValue({ id: 'r1' })
})

describe('PATCH /api/recipes/:id', () => {
  it('applies a partial update', async () => {
    await expect(handler(event({ title: 'Nieuwe naam' }))).resolves.toEqual({
      id: 'r1',
    })
    expect(updateOwnRecipe).toHaveBeenCalledWith(
      'r1',
      'u1',
      expect.objectContaining({ title: 'Nieuwe naam' }),
    )
  })

  it('accepts an image key', async () => {
    await handler(event({ imageKey: RECIPE_IMAGE_KEY }))

    expect(updateOwnRecipe).toHaveBeenCalledWith(
      'r1',
      'u1',
      expect.objectContaining({ imageKey: RECIPE_IMAGE_KEY }),
    )
  })

  it('rejects an image key the app could not have issued', async () => {
    await expect(
      handler(event({ imageKey: 'recipes/../secret.webp' })),
    ).rejects.toThrow()
    expect(updateOwnRecipe).not.toHaveBeenCalled()
  })

  it('rejects an empty title', async () => {
    await expect(handler(event({ title: '   ' }))).rejects.toThrow()
    expect(updateOwnRecipe).not.toHaveBeenCalled()
  })

  it('is a 404 when the recipe is not the user’s to change', async () => {
    updateOwnRecipe.mockResolvedValue(undefined)

    await expect(handler(event({ title: 'Soep' }))).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event({ title: 'Soep' }))).rejects.toThrow(
      'Unauthorized',
    )
    expect(updateOwnRecipe).not.toHaveBeenCalled()
  })
})
