import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { detail } from '~~/test/fixtures/recipes'

const { findRecipeForUser } = vi.hoisted(() => ({
  findRecipeForUser: vi.fn(),
}))

vi.mock('~~/server/utils/recipes', () => ({ findRecipeForUser }))

const handler = (await import('~~/server/api/recipes/[id].get')).default

const event = () => mockEvent({ params: { id: 'r1' } })

beforeEach(() => {
  resetSession({ id: 'u1' })
  findRecipeForUser.mockResolvedValue(detail())
})

describe('GET /api/recipes/:id', () => {
  it('returns the recipe', async () => {
    const result = await handler(event())

    expect(findRecipeForUser).toHaveBeenCalledWith('r1', 'u1')
    expect(result).toEqual(detail())
  })

  it('is a 404 when the recipe does not exist', async () => {
    findRecipeForUser.mockResolvedValue(undefined)

    await expect(handler(event())).rejects.toMatchObject({ statusCode: 404 })
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event())).rejects.toThrow('Unauthorized')
    expect(findRecipeForUser).not.toHaveBeenCalled()
  })
})
