import { describe, expect, it } from 'vitest'
import {
  recipeImageKeySchema,
  recipeImportSchema,
  recipeInputSchema,
  recipeQuerySchema,
  recipeUpdateSchema,
} from '~~/shared/schemas/recipe'

const minimal = { title: 'Soep' }

describe('recipeInputSchema', () => {
  it('fills in nulls and empty lists for a minimal recipe', () => {
    expect(recipeInputSchema.parse(minimal)).toEqual({
      title: 'Soep',
      description: null,
      imageKey: null,
      sourceUrl: null,
      sourceName: null,
      servings: null,
      prepMinutes: null,
      cookMinutes: null,
      ingredients: [],
      instructions: [],
      tags: [],
      notes: null,
    })
  })

  it('turns blank form fields into null', () => {
    const parsed = recipeInputSchema.parse({
      ...minimal,
      description: '   ',
      imageKey: '',
      servings: '',
    })

    expect(parsed.description).toBeNull()
    expect(parsed.imageKey).toBeNull()
    expect(parsed.servings).toBeNull()
  })

  it('requires a title', () => {
    expect(recipeInputSchema.safeParse({ title: '  ' }).success).toBe(false)
  })

  it('rejects non-http urls', () => {
    expect(
      recipeInputSchema.safeParse({
        ...minimal,
        sourceUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false)
  })

  it('trims list entries and drops empty ones', () => {
    const parsed = recipeInputSchema.parse({
      ...minimal,
      ingredients: [' 1 ui ', '2 tl zout'],
    })

    expect(parsed.ingredients).toEqual(['1 ui', '2 tl zout'])
  })

  it('rejects out of range numbers', () => {
    expect(
      recipeInputSchema.safeParse({ ...minimal, servings: 0 }).success,
    ).toBe(false)
    expect(
      recipeInputSchema.safeParse({ ...minimal, servings: 1.5 }).success,
    ).toBe(false)
  })
})

describe('recipeImageKeySchema', () => {
  const key = 'recipes/6f1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d.webp'

  it('accepts a key the app generated', () => {
    expect(recipeImageKeySchema.safeParse(key).success).toBe(true)
  })

  it('rejects keys outside the recipes prefix', () => {
    expect(
      recipeImageKeySchema.safeParse(
        'other/6f1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d.webp',
      ).success,
    ).toBe(false)
  })

  it('rejects traversal and arbitrary object names', () => {
    expect(
      recipeImageKeySchema.safeParse('recipes/../secret.webp').success,
    ).toBe(false)
    expect(
      recipeImageKeySchema.safeParse('recipes/anything.webp').success,
    ).toBe(false)
  })

  it('rejects extensions the app does not store', () => {
    expect(
      recipeImageKeySchema.safeParse(key.replace('.webp', '.svg')).success,
    ).toBe(false)
  })
})

describe('recipeUpdateSchema', () => {
  it('accepts a single field', () => {
    expect(recipeUpdateSchema.parse({ title: 'Nieuw' })).toEqual({
      title: 'Nieuw',
    })
  })

  it('still validates the fields that are present', () => {
    expect(recipeUpdateSchema.safeParse({ title: '' }).success).toBe(false)
  })
})

describe('recipeImportSchema', () => {
  it('accepts http and https urls', () => {
    expect(recipeImportSchema.parse({ url: 'https://x.test/recept' }).url).toBe(
      'https://x.test/recept',
    )
  })

  it('rejects other protocols and junk', () => {
    expect(
      recipeImportSchema.safeParse({ url: 'file:///etc/passwd' }).success,
    ).toBe(false)
    expect(recipeImportSchema.safeParse({ url: 'geen url' }).success).toBe(
      false,
    )
  })
})

describe('recipeQuerySchema', () => {
  it('allows an empty query', () => {
    expect(recipeQuerySchema.parse({})).toEqual({})
  })

  it('trims search terms', () => {
    expect(recipeQuerySchema.parse({ q: '  pasta ' }).q).toBe('pasta')
  })
})
