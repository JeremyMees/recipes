import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { listItem } from '~~/test/fixtures/recipes'

const { listOwnRecipes } = vi.hoisted(() => ({ listOwnRecipes: vi.fn() }))

vi.mock('~~/server/utils/recipes', () => ({ listOwnRecipes }))

const handler = (await import('~~/server/api/recipes/index.get')).default

beforeEach(() => {
  resetSession({ id: 'u1' })
  listOwnRecipes.mockResolvedValue([listItem()])
})

describe('GET /api/recipes', () => {
  it('lists the recipes of the signed-in user', async () => {
    const result = await handler(mockEvent({ path: '/api/recipes' }))

    expect(listOwnRecipes).toHaveBeenCalledWith('u1', {})
    expect(result).toEqual([listItem()])
  })

  it('passes a search term through', async () => {
    await handler(mockEvent({ path: '/api/recipes?q=pasta' }))

    expect(listOwnRecipes).toHaveBeenCalledWith('u1', { q: 'pasta' })
  })

  it('passes a tag filter through', async () => {
    await handler(mockEvent({ path: '/api/recipes?tag=oven' }))

    expect(listOwnRecipes).toHaveBeenCalledWith('u1', { tag: 'oven' })
  })

  it('rejects a query the schema does not allow', async () => {
    await expect(
      handler(mockEvent({ path: `/api/recipes?q=${'x'.repeat(201)}` })),
    ).rejects.toThrow()
    expect(listOwnRecipes).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(mockEvent({ path: '/api/recipes' }))).rejects.toThrow(
      'Unauthorized',
    )
    expect(listOwnRecipes).not.toHaveBeenCalled()
  })
})
