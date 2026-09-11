import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEvent } from '~~/test/unit/stubs/nitro'
import { resetSession } from '~~/test/unit/stubs/auth'

const { listOwnTags } = vi.hoisted(() => ({ listOwnTags: vi.fn() }))

vi.mock('~~/server/utils/recipes', () => ({ listOwnTags }))

const handler = (await import('~~/server/api/recipes/tags.get')).default

beforeEach(() => {
  resetSession({ id: 'u1' })
  listOwnTags.mockResolvedValue(['oven', 'pasta'])
})

describe('GET /api/recipes/tags', () => {
  it('returns the tags of the signed-in user', async () => {
    const result = await handler(mockEvent())

    expect(listOwnTags).toHaveBeenCalledWith('u1')
    expect(result).toEqual(['oven', 'pasta'])
  })

  it('requires a session', async () => {
    resetSession()

    await expect(handler(mockEvent())).rejects.toThrow('Unauthorized')
    expect(listOwnTags).not.toHaveBeenCalled()
  })
})
