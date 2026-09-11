import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runtimeConfig, sent, clientOptions, signed } = vi.hoisted(() => ({
  runtimeConfig: { s3Endpoint: 'https://s3.example.test' },
  sent: [] as { name: string; input: Record<string, unknown> }[],
  clientOptions: [] as Record<string, unknown>[],
  signed: { fail: false },
}))

vi.mock('#app', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('@aws-sdk/client-s3', () => {
  class Command {
    name: string
    input: Record<string, unknown>

    constructor(name: string, input: Record<string, unknown>) {
      this.name = name
      this.input = input
    }
  }

  return {
    S3Client: class {
      constructor(options: Record<string, unknown>) {
        clientOptions.push(options)
      }

      async send(command: Command) {
        if (signed.fail) throw new Error('s3 unavailable')

        sent.push({ name: command.name, input: command.input })

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
  getSignedUrl: async (
    _client: unknown,
    command: { input: Record<string, unknown> },
    options: { expiresIn: number },
  ) =>
    `https://signed.example.test/${command.input.Key}?exp=${options.expiresIn}`,
}))

const {
  deleteRecipeImage,
  isRecipeImageType,
  presignRecipeImageUpload,
  putRecipeImage,
  recipeImageKey,
  recipeImageUrl,
  uploadHeaders,
} = await import('~~/server/utils/storage')

beforeEach(() => {
  sent.length = 0
  signed.fail = false
})

describe('isRecipeImageType', () => {
  it('accepts the image types the app stores', () => {
    expect(isRecipeImageType('image/webp')).toBe(true)
    expect(isRecipeImageType('image/jpeg')).toBe(true)
    expect(isRecipeImageType('image/png')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isRecipeImageType('image/svg+xml')).toBe(false)
    expect(isRecipeImageType('text/html')).toBe(false)
  })
})

describe('recipeImageKey', () => {
  it('namespaces keys and uses the extension for the type', () => {
    expect(recipeImageKey('image/webp')).toMatch(
      /^recipes\/[0-9a-f-]{36}\.webp$/,
    )
    expect(recipeImageKey('image/jpeg')).toMatch(
      /^recipes\/[0-9a-f-]{36}\.jpg$/,
    )
  })

  it('does not repeat keys', () => {
    expect(recipeImageKey('image/webp')).not.toBe(recipeImageKey('image/webp'))
  })
})

describe('recipeImageUrl', () => {
  it('builds a path-style bucket url', () => {
    expect(recipeImageUrl('recipes/a.webp')).toBe(
      'https://s3.example.test/recipes-images/recipes/a.webp',
    )
  })

  it('does not double up slashes from the endpoint', () => {
    runtimeConfig.s3Endpoint = 'https://s3.example.test/'

    expect(recipeImageUrl('recipes/a.webp')).toBe(
      'https://s3.example.test/recipes-images/recipes/a.webp',
    )

    runtimeConfig.s3Endpoint = 'https://s3.example.test'
  })

  it('passes a missing key straight through', () => {
    expect(recipeImageUrl(null)).toBeNull()
  })

  it('returns null when storage is not configured', () => {
    runtimeConfig.s3Endpoint = ''

    expect(recipeImageUrl('recipes/a.webp')).toBeNull()

    runtimeConfig.s3Endpoint = 'https://s3.example.test'
  })
})

describe('presignRecipeImageUpload', () => {
  it('signs a put for the bucket key with the cache headers it will be stored with', async () => {
    const url = await presignRecipeImageUpload('recipes/a.webp', 'image/webp')

    expect(url).toBe('https://signed.example.test/recipes/a.webp?exp=300')
  })

  it('builds one path-style client, which Neon requires, and reuses it', async () => {
    await presignRecipeImageUpload('recipes/a.webp', 'image/webp')
    await putRecipeImage(new Uint8Array([1]), 'image/webp')

    expect(clientOptions).toEqual([{ forcePathStyle: true }])
  })
})

describe('putRecipeImage', () => {
  it('stores the body under a generated key and returns it', async () => {
    const key = await putRecipeImage(new Uint8Array([1, 2]), 'image/jpeg')

    expect(key).toMatch(/^recipes\/[0-9a-f-]{36}\.jpg$/)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      name: 'put',
      input: {
        Bucket: 'recipes-images',
        Key: key,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      },
    })
  })

  it('propagates a failed write so the caller can fall back', async () => {
    signed.fail = true

    await expect(
      putRecipeImage(new Uint8Array([1]), 'image/webp'),
    ).rejects.toThrow('s3 unavailable')
  })
})

describe('deleteRecipeImage', () => {
  it('deletes the object', async () => {
    await deleteRecipeImage('recipes/a.webp')

    expect(sent).toEqual([
      {
        name: 'delete',
        input: { Bucket: 'recipes-images', Key: 'recipes/a.webp' },
      },
    ])
  })

  it('does nothing without a key', async () => {
    await deleteRecipeImage(null)

    expect(sent).toHaveLength(0)
  })

  it('swallows failures, leaving an orphan rather than throwing', async () => {
    signed.fail = true

    await expect(deleteRecipeImage('recipes/a.webp')).resolves.toBeUndefined()
  })
})

describe('uploadHeaders', () => {
  it('returns the headers the signed put expects', () => {
    expect(uploadHeaders('image/webp')).toEqual({
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
    })
  })
})
