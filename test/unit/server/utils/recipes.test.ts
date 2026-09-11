import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RECIPE_IMAGE_KEY,
  OTHER_IMAGE_KEY,
  row,
} from '~~/test/fixtures/recipes'

const { runtimeConfig, database, s3 } = await vi.hoisted(async () => {
  const { createDbStub: create } = await import('~~/test/unit/stubs/db')

  return {
    runtimeConfig: {
      s3Endpoint: 'https://s3.test',
      databaseUrl: 'postgres://test/db',
    },
    database: create(),
    s3: { sent: [] as { name: string; input: Record<string, unknown> }[] },
  }
})

vi.mock('#app', () => ({
  useRuntimeConfig: () => runtimeConfig,
  createError: (input: { statusMessage: string }) =>
    new Error(input.statusMessage),
}))

vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}) }))
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: () => database.db }))

vi.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(
      public name: string,
      public input: Record<string, unknown>,
    ) {}
  }

  return {
    S3Client: class {
      async send(command: Command) {
        s3.sent.push({ name: command.name, input: command.input })

        return {}
      }
    },
    PutObjectCommand: class extends Command {
      constructor(input: Record<string, unknown>) {
        super('put', input)
      }
    },
    DeleteObjectCommand: class extends Command {
      constructor(input: Record<string, unknown>) {
        super('delete', input)
      }
    },
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://signed.test',
}))

const {
  createRecipe,
  deleteOwnRecipe,
  findRecipeForUser,
  isRecipeImageKeyInUse,
  listFamilyRecipes,
  listOwnRecipes,
  listOwnTags,
  updateOwnRecipe,
} = await import('~~/server/utils/recipes')

beforeEach(() => {
  database.reset()
  s3.sent.length = 0
})

function listRow(overrides: Record<string, unknown> = {}) {
  const {
    id,
    title,
    description,
    imageKey,
    sourceName,
    servings,
    prepMinutes,
    cookMinutes,
    tags,
    createdAt,
  } = row(overrides)

  return {
    id,
    title,
    description,
    imageKey,
    sourceName,
    servings,
    prepMinutes,
    cookMinutes,
    tags,
    createdAt,
    authorName: 'Mama',
  }
}

describe('listOwnRecipes', () => {
  it('maps rows to list items with a public image url', async () => {
    database.results.push([listRow({ imageKey: RECIPE_IMAGE_KEY })])

    const [item] = await listOwnRecipes('u1', {})

    expect(item).toMatchObject({
      id: 'r1',
      title: 'Spaghetti bolognese',
      imageUrl: `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
      authorName: 'Mama',
      createdAt: '2026-09-01T10:00:00.000Z',
    })
  })

  it('leaves the image url null when the recipe has no image', async () => {
    database.results.push([listRow()])

    const [item] = await listOwnRecipes('u1', {})

    expect(item!.imageUrl).toBeNull()
  })

  it('orders newest first', async () => {
    database.results.push([])

    await listOwnRecipes('u1', {})

    expect(database.called('orderBy')).toBeDefined()
  })

  it('adds a filter for a search term', async () => {
    database.results.push([])

    await listOwnRecipes('u1', { q: 'pasta' })

    expect(database.called('where')!.args).toHaveLength(1)
  })

  it('adds a filter for a tag', async () => {
    database.results.push([])

    await listOwnRecipes('u1', { tag: 'Pasta' })

    expect(database.called('where')).toBeDefined()
  })
})

describe('listFamilyRecipes', () => {
  it('maps rows the same way', async () => {
    database.results.push([listRow()])

    await expect(listFamilyRecipes('u1', {})).resolves.toHaveLength(1)
  })
})

describe('findRecipeForUser', () => {
  it('returns undefined when the recipe does not exist', async () => {
    database.results.push([])

    await expect(findRecipeForUser('r1', 'u1')).resolves.toBeUndefined()
  })

  it('returns the detail with the raw key alongside the url', async () => {
    database.results.push([
      { recipe: row({ imageKey: RECIPE_IMAGE_KEY }), authorName: 'Mama' },
    ])

    const found = await findRecipeForUser('r1', 'u1')

    expect(found).toMatchObject({
      imageKey: RECIPE_IMAGE_KEY,
      imageUrl: `https://s3.test/recipes-images/${RECIPE_IMAGE_KEY}`,
      ingredients: ['500 gr gehakt'],
      canEdit: true,
    })
  })

  it('marks a recipe owned by someone else as not editable', async () => {
    database.results.push([
      { recipe: row({ userId: 'someone-else' }), authorName: 'Papa' },
    ])

    const found = await findRecipeForUser('r1', 'u1')

    expect(found!.canEdit).toBe(false)
  })
})

describe('createRecipe', () => {
  it('returns the new id', async () => {
    database.results.push([{ id: 'new-1' }])

    await expect(
      createRecipe('u1', { title: 'Soep' } as never),
    ).resolves.toEqual({ id: 'new-1' })
  })
})

describe('updateOwnRecipe', () => {
  it('returns undefined when nothing was updated', async () => {
    database.results.push([{ imageKey: null }], [])

    await expect(
      updateOwnRecipe('r1', 'u1', { title: 'Soep' }),
    ).resolves.toBeUndefined()
  })

  it('deletes the superseded image once the new key is committed', async () => {
    database.results.push(
      [{ imageKey: RECIPE_IMAGE_KEY }],
      [{ id: 'r1', imageKey: OTHER_IMAGE_KEY }],
    )

    await updateOwnRecipe('r1', 'u1', { imageKey: OTHER_IMAGE_KEY })

    expect(s3.sent).toEqual([
      {
        name: 'delete',
        input: { Bucket: 'recipes-images', Key: RECIPE_IMAGE_KEY },
      },
    ])
  })

  it('deletes the old image when it is cleared', async () => {
    database.results.push(
      [{ imageKey: RECIPE_IMAGE_KEY }],
      [{ id: 'r1', imageKey: null }],
    )

    await updateOwnRecipe('r1', 'u1', { imageKey: null })

    expect(s3.sent).toHaveLength(1)
  })

  it('keeps the image when the key did not change', async () => {
    database.results.push(
      [{ imageKey: RECIPE_IMAGE_KEY }],
      [{ id: 'r1', imageKey: RECIPE_IMAGE_KEY }],
    )

    await updateOwnRecipe('r1', 'u1', { title: 'Soep' })

    expect(s3.sent).toHaveLength(0)
  })

  it('returns only the id', async () => {
    database.results.push([{ imageKey: null }], [{ id: 'r1', imageKey: null }])

    await expect(updateOwnRecipe('r1', 'u1', {})).resolves.toEqual({ id: 'r1' })
  })
})

describe('isRecipeImageKeyInUse', () => {
  it('is true while a recipe still points at the key', async () => {
    database.results.push([{ id: 'r1' }])

    await expect(isRecipeImageKeyInUse(RECIPE_IMAGE_KEY)).resolves.toBe(true)
  })

  it('is false once nothing references it', async () => {
    database.results.push([])

    await expect(isRecipeImageKeyInUse(RECIPE_IMAGE_KEY)).resolves.toBe(false)
  })
})

describe('deleteOwnRecipe', () => {
  it('removes the stored image with the row', async () => {
    database.results.push([{ id: 'r1', imageKey: RECIPE_IMAGE_KEY }])

    await expect(deleteOwnRecipe('r1', 'u1')).resolves.toBe(true)
    expect(s3.sent).toHaveLength(1)
  })

  it('reports when nothing was deleted', async () => {
    database.results.push([])

    await expect(deleteOwnRecipe('r1', 'u1')).resolves.toBe(false)
    expect(s3.sent).toHaveLength(0)
  })
})

describe('listOwnTags', () => {
  it('flattens, dedupes and sorts tags', async () => {
    database.results.push([
      { tags: ['pasta', 'snel'] },
      { tags: ['snel', 'oven'] },
    ])

    await expect(listOwnTags('u1')).resolves.toEqual(['oven', 'pasta', 'snel'])
  })
})
