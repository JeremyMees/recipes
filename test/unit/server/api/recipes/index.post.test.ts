import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'

const { createRecipe } = vi.hoisted(() => ({ createRecipe: vi.fn() }))

vi.mock('~~/server/utils/recipes', () => ({ createRecipe }))

const handler = (await import('~~/server/api/recipes/index.post')).default

const event = (body: unknown) => mockEvent({ method: 'POST', body })

beforeEach(() => {
  resetSession({ id: 'u1' })
  createRecipe.mockResolvedValue({ id: 'new-1' })
})

describe('POST /api/recipes', () => {
  it('creates the recipe for the signed-in user', async () => {
    await expect(handler(event({ title: 'Soep' }))).resolves.toEqual({
      id: 'new-1',
    })
    expect(createRecipe).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Soep' }),
    )
  })

  it('fills in the nullable fields the schema defaults', async () => {
    await handler(event({ title: 'Soep' }))

    expect(createRecipe.mock.calls[0]![1]).toMatchObject({
      description: null,
      imageKey: null,
      ingredients: [],
      tags: [],
    })
  })

  it('rejects a recipe with no title', async () => {
    await expect(handler(event({ description: 'geen naam' }))).rejects.toThrow()
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it('rejects a source url that is not http', async () => {
    await expect(
      handler(event({ title: 'Soep', sourceUrl: 'javascript:alert(1)' })),
    ).rejects.toThrow()
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(event({ title: 'Soep' }))).rejects.toThrow(
      'Unauthorized',
    )
    expect(createRecipe).not.toHaveBeenCalled()
  })
})
