import { describe, expect, it } from 'vitest'
import { isAllowedEmail, parseAllowlist } from '~~/server/utils/allowlist'

describe('parseAllowlist', () => {
  it('splits, trims and lowercases entries', () => {
    expect(parseAllowlist(' A@x.test, b@y.test ,,C@z.test ')).toEqual([
      'a@x.test',
      'b@y.test',
      'c@z.test',
    ])
  })

  it('returns an empty list when unset', () => {
    expect(parseAllowlist(undefined)).toEqual([])
    expect(parseAllowlist('')).toEqual([])
  })
})

describe('isAllowedEmail', () => {
  const allowlist = 'jeremy@x.test,mama@x.test'

  it('allows listed addresses regardless of casing or padding', () => {
    expect(isAllowedEmail('jeremy@x.test', allowlist)).toBe(true)
    expect(isAllowedEmail(' JEREMY@X.test ', allowlist)).toBe(true)
  })

  it('rejects unlisted addresses', () => {
    expect(isAllowedEmail('stranger@x.test', allowlist)).toBe(false)
  })

  it('fails closed when there is no email or no allowlist', () => {
    expect(isAllowedEmail(undefined, allowlist)).toBe(false)
    expect(isAllowedEmail(null, allowlist)).toBe(false)
    expect(isAllowedEmail('jeremy@x.test', undefined)).toBe(false)
    expect(isAllowedEmail('jeremy@x.test', '')).toBe(false)
  })
})
