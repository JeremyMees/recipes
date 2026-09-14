import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'
import { listPage } from '~~/test/fixtures/recipes'

const { listFamilyRecipes } = vi.hoisted(() => ({
  listFamilyRecipes: vi.fn(),
}))

vi.mock('~~/server/utils/recipes', () => ({ listFamilyRecipes }))

const handler = (await import('~~/server/api/recipes/family.get')).default

beforeEach(() => {
  resetSession({ id: 'u1' })
  listFamilyRecipes.mockResolvedValue(listPage())
})

describe('GET /api/recipes/family', () => {
  it('lists recipes belonging to everyone else', async () => {
    const result = await handler(mockEvent({ path: '/api/recipes/family' }))

    expect(listFamilyRecipes).toHaveBeenCalledWith('u1', {})
    expect(result).toEqual(listPage())
  })

  it('passes the search query through', async () => {
    await handler(mockEvent({ path: '/api/recipes/family?q=soep' }))

    expect(listFamilyRecipes).toHaveBeenCalledWith('u1', { q: 'soep' })
  })

  it('requires a session', async () => {
    resetSession()

    await expect(
      handler(mockEvent({ path: '/api/recipes/family' })),
    ).rejects.toThrow('Unauthorized')
    expect(listFamilyRecipes).not.toHaveBeenCalled()
  })
})
