import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'

const { deleteOwnRecipe } = vi.hoisted(() => ({ deleteOwnRecipe: vi.fn() }))

vi.mock('~~/server/utils/recipes', () => ({ deleteOwnRecipe }))

const handler = (await import('~~/server/api/recipes/[id].delete')).default

const event = () => mockEvent({ method: 'DELETE', params: { id: 'r1' } })

beforeEach(() => {
  resetSession({ id: 'u1' })
  deleteOwnRecipe.mockResolvedValue(true)
})

describe('DELETE /api/recipes/:id', () => {
  it('deletes the recipe and echoes the id', async () => {
    await expect(handler(event())).resolves.toEqual({ id: 'r1' })
    expect(deleteOwnRecipe).toHaveBeenCalledWith('r1', 'u1')
  })

  it('is a 404 when the recipe is not the user’s to delete', async () => {
    deleteOwnRecipe.mockResolvedValue(false)

    await expect(handler(event())).rejects.toMatchObject({ statusCode: 404 })
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event())).rejects.toThrow('Unauthorized')
    expect(deleteOwnRecipe).not.toHaveBeenCalled()
  })
})
