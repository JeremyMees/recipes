import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { readBody } from 'h3'
import { defineComponent } from 'vue'
import {
  useRecipeImageDelete,
  useRecipeImageNormalize,
  useRecipeImageUpload,
} from '~/composables/use-recipe-image-upload'
import {
  createCanvasStub,
  spyOnCanvasElement,
  stubImageBitmap,
  stubUndecodableImage,
  type CanvasStub,
} from '~~/test/unit/stubs/canvas'
import { RECIPE_IMAGE_KEY as KEY } from '~~/test/fixtures/recipes'

let canvas: CanvasStub

let presignBodies: unknown[]
let deleteBodies: unknown[]
let putRequests: { url: string; headers: unknown; body: unknown }[]
let sourceRequests: string[]
let putStatus: number
let deleteStatus: number
let sourceStatus: number

registerEndpoint('/api/recipes/image-upload', {
  method: 'POST',
  handler: async event => {
    presignBodies.push(await readBody(event))

    return {
      key: KEY,
      url: `https://bucket.test/recipes-images/${KEY}`,
      uploadUrl: `https://bucket.test/signed/${KEY}`,
      headers: {
        'content-type': 'image/webp',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    }
  },
})

registerEndpoint('/api/recipes/image-delete', {
  method: 'POST',
  handler: async event => {
    deleteBodies.push(await readBody(event))

    if (deleteStatus !== 200) {
      throw createError({ statusCode: deleteStatus })
    }

    return { key: KEY }
  },
})

beforeEach(() => {
  presignBodies = []
  deleteBodies = []
  putRequests = []
  sourceRequests = []
  putStatus = 200
  deleteStatus = 200
  sourceStatus = 200

  canvas = createCanvasStub()

  stubImageBitmap(canvas, 3000, 2000)
  spyOnCanvasElement(canvas)

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      putRequests.push({
        url: String(url),
        headers: init.headers,
        body: init.body,
      })

      return new Response(null, { status: putStatus })
    }

    sourceRequests.push(String(url))

    return new Response(
      sourceStatus === 200
        ? new Blob(['stored'], { type: 'image/jpeg' })
        : null,
      { status: sourceStatus },
    )
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function withComposables() {
  const captured: {
    upload?: ReturnType<typeof useRecipeImageUpload>
    remove?: ReturnType<typeof useRecipeImageDelete>
    normalize?: ReturnType<typeof useRecipeImageNormalize>
  } = {}

  await mountSuspended(
    defineComponent({
      setup() {
        captured.upload = useRecipeImageUpload()
        captured.remove = useRecipeImageDelete()
        captured.normalize = useRecipeImageNormalize()

        return () => null
      },
    }),
    {
      global: {
        plugins: [
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: { mutations: { retry: false } },
              }),
            },
          ],
        ],
      },
    },
  )

  return captured
}

describe('useRecipeImageUpload', () => {
  it('asks for a webp ticket, uploads the encoded blob, and returns the key', async () => {
    const { upload } = await withComposables()

    const result = await upload!.mutateAsync(new File(['raw'], 'photo.jpg'))

    expect(presignBodies).toEqual([{ contentType: 'image/webp' }])
    expect(result).toEqual({
      key: KEY,
      url: `https://bucket.test/recipes-images/${KEY}`,
    })
  })

  it('sends the blob to the signed url with the headers the signature covers', async () => {
    const { upload } = await withComposables()

    await upload!.mutateAsync(new File(['raw'], 'photo.jpg'))

    expect(putRequests).toHaveLength(1)
    expect(putRequests[0]!.url).toBe(`https://bucket.test/signed/${KEY}`)
    expect(putRequests[0]!.headers).toEqual({
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
    })
  })

  it('uploads webp rather than the file it was given', async () => {
    const { upload } = await withComposables()

    await upload!.mutateAsync(new File(['raw'], 'photo.jpg'))

    const body = putRequests[0]!.body as Blob

    expect(body).toBeInstanceOf(Blob)
    expect(body.type).toBe('image/webp')
  })

  it('fails when the bucket rejects the upload', async () => {
    putStatus = 403

    const { upload } = await withComposables()

    await expect(
      upload!.mutateAsync(new File(['raw'], 'photo.jpg')),
    ).rejects.toThrow('upload failed')
  })

  it('does not upload when no ticket can be issued', async () => {
    const { upload } = await withComposables()

    stubUndecodableImage()

    await expect(
      upload!.mutateAsync(new File(['raw'], 'photo.jpg')),
    ).rejects.toThrow('decode failed')
    expect(presignBodies).toHaveLength(0)
    expect(putRequests).toHaveLength(0)
  })
})

describe('useRecipeImageDelete', () => {
  it('posts the key to discard', async () => {
    const { remove } = await withComposables()

    await remove!.mutateAsync(KEY)

    expect(deleteBodies).toEqual([{ key: KEY }])
  })

  it('rejects when the image is still attached to a recipe', async () => {
    deleteStatus = 409

    const { remove } = await withComposables()

    await expect(remove!.mutateAsync(KEY)).rejects.toThrow()
  })
})

describe('useRecipeImageNormalize', () => {
  const imported = {
    key: 'recipes/imported.jpg',
    url: 'https://bucket.test/recipes-images/recipes/imported.jpg',
  }

  it('re-encodes a stored image and returns the replacement', async () => {
    const { normalize } = await withComposables()

    const result = await normalize!.mutateAsync(imported)

    expect(sourceRequests).toEqual([imported.url])
    expect(presignBodies).toEqual([{ contentType: 'image/webp' }])
    expect(result).toEqual({
      key: KEY,
      url: `https://bucket.test/recipes-images/${KEY}`,
    })
  })

  it('stores webp rather than the jpeg it fetched', async () => {
    const { normalize } = await withComposables()

    await normalize!.mutateAsync(imported)

    const body = putRequests[0]!.body as Blob

    expect(body.type).toBe('image/webp')
  })

  it('caps the long edge so the replacement is not full size', async () => {
    const { normalize } = await withComposables()

    await normalize!.mutateAsync(imported)

    expect(canvas.drawn).toEqual([{ width: 1200, height: 800 }])
  })

  it('discards the original once the replacement is stored', async () => {
    const { normalize } = await withComposables()

    await normalize!.mutateAsync(imported)

    expect(deleteBodies).toEqual([{ key: imported.key }])
  })

  it('keeps the replacement when the original cannot be discarded', async () => {
    deleteStatus = 409

    const { normalize } = await withComposables()

    await expect(normalize!.mutateAsync(imported)).resolves.toEqual({
      key: KEY,
      url: `https://bucket.test/recipes-images/${KEY}`,
    })
  })

  it('fails without uploading when the stored image cannot be read', async () => {
    sourceStatus = 404

    const { normalize } = await withComposables()

    await expect(normalize!.mutateAsync(imported)).rejects.toThrow(
      'source unreadable',
    )
    expect(presignBodies).toHaveLength(0)
    expect(putRequests).toHaveLength(0)
    expect(deleteBodies).toHaveLength(0)
  })

  it('leaves the original in place when the replacement upload fails', async () => {
    putStatus = 403

    const { normalize } = await withComposables()

    await expect(normalize!.mutateAsync(imported)).rejects.toThrow(
      'upload failed',
    )
    expect(deleteBodies).toHaveLength(0)
  })
})
