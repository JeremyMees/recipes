import { describe, expect, it } from 'vitest'
import { formatMinutes, formatServings, totalMinutes } from '~/utils/format'

describe('formatMinutes', () => {
  it('formats minutes and hours in Dutch', () => {
    expect(formatMinutes(25)).toBe('25 min')
    expect(formatMinutes(60)).toBe('1 u')
    expect(formatMinutes(90)).toBe('1 u 30 min')
    expect(formatMinutes(135)).toBe('2 u 15 min')
  })

  it('returns null for absent or zero durations', () => {
    expect(formatMinutes(null)).toBeNull()
    expect(formatMinutes(undefined)).toBeNull()
    expect(formatMinutes(0)).toBeNull()
  })
})

describe('totalMinutes', () => {
  it('adds prep and cook time', () => {
    expect(totalMinutes(15, 30)).toBe(45)
    expect(totalMinutes(15, null)).toBe(15)
    expect(totalMinutes(null, 30)).toBe(30)
  })

  it('returns null when there is nothing to add', () => {
    expect(totalMinutes(null, null)).toBeNull()
    expect(totalMinutes(0, 0)).toBeNull()
  })
})

describe('formatServings', () => {
  it('uses singular and plural', () => {
    expect(formatServings(1)).toBe('1 persoon')
    expect(formatServings(4)).toBe('4 personen')
  })

  it('returns null when unknown', () => {
    expect(formatServings(null)).toBeNull()
    expect(formatServings(0)).toBeNull()
  })
})
