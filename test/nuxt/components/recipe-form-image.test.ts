import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { readBody } from 'h3'
import RecipeForm from '~/components/recipe-form.vue'
import { stubObjectUrls } from '~~/test/unit/stubs/canvas'
import { RECIPE_IMAGE_KEY } from '~~/test/fixtures/recipes'
import { testId } from '~~/test/unit/stubs/selectors'

vi.mock('~/utils/image', () => ({
  toWebpBlob: async () => new Blob(['webp'], { type: 'image/webp' }),
}))

stubObjectUrls()

let issuedKeys: string[]
let deleted: string[]
let deleteAttempts: string[]
let putRequests: { url: string; headers: Record<string, string> }[]
let deleteStatus: number
let presignStatus: number

registerEndpoint('/api/recipes/image-upload', {
  method: 'POST',
  handler: () => {
    if (presignStatus !== 200) {
      throw createError({ statusCode: presignStatus })
    }

    const key = `recipes/0000000${issuedKeys.length}-0000-0000-0000-000000000000.webp`

    issuedKeys.push(key)

    return {
      key,
      url: `https://bucket.test/recipes-images/${key}`,
      uploadUrl: `https://bucket.test/signed/${key}`,
      headers: { 'content-type': 'image/webp' },
    }
  },
})

registerEndpoint('/api/recipes/image-delete', {
  method: 'POST',
  handler: async event => {
    const { key } = await readBody(event)

    deleteAttempts.push(key)

    if (deleteStatus !== 200) {
      throw createError({ statusCode: deleteStatus })
    }

    deleted.push(key)

    return { key }
  },
})

beforeEach(() => {
  issuedKeys = []
  deleted = []
  deleteAttempts = []
  putRequests = []
  deleteStatus = 200
  presignStatus = 200

  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    putRequests.push({
      url: String(url),
      headers: init.headers as Record<string, string>,
    })

    return new Response(null, { status: 200 })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mount(props: Record<string, unknown> = {}) {
  return mountSuspended(RecipeForm, {
    props,
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
  })
}

async function selectFile(
  component: Awaited<ReturnType<typeof mount>>,
  name = 'photo.jpg',
) {
  const upload = component.findComponent({ name: 'UFileUpload' })

  upload.vm.$emit('update:modelValue', new File(['x'], name))

  await expect
    .poll(() => putRequests.length > 0 || presignStatus !== 200)
    .toBe(true)
  await component.vm.$nextTick()
}

describe('RecipeForm image field', () => {
  it('offers the uploader when the recipe has no image', async () => {
    const component = await mount()

    expect(component.find(testId('recipe-form-image-upload')).exists()).toBe(
      true,
    )
    expect(component.find(testId('recipe-form-image')).exists()).toBe(false)
  })

  it('shows the existing image instead of the uploader', async () => {
    const component = await mount({ imageUrl: 'https://bucket.test/a.webp' })

    const image = component.find(testId('recipe-form-image'))

    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('https://bucket.test/a.webp')
    expect(component.find(testId('recipe-form-image-upload')).exists()).toBe(
      false,
    )
  })

  it('uploads the encoded file and shows it as the preview', async () => {
    const component = await mount()

    await selectFile(component)

    expect(putRequests).toHaveLength(1)
    expect(putRequests[0]!.url).toBe(
      `https://bucket.test/signed/${issuedKeys[0]}`,
    )
    expect(component.find(testId('recipe-form-image')).attributes('src')).toBe(
      `https://bucket.test/recipes-images/${issuedKeys[0]}`,
    )
  })

  it('submits the uploaded key', async () => {
    const component = await mount({ initial: { title: 'Soep' } })

    await selectFile(component)
    await component.get(testId('recipe-form')).trigger('submit')
    await expect.poll(() => component.emitted('submit')).toBeDefined()

    expect(component.emitted('submit')?.at(-1)?.[0]).toMatchObject({
      imageKey: issuedKeys[0],
    })
  })

  it('discards an unsaved upload when a second file replaces it', async () => {
    const component = await mount()

    await selectFile(component, 'first.jpg')
    await component.get(testId('recipe-form-image-remove')).trigger('click')
    await selectFile(component, 'second.jpg')
    await expect.poll(() => deleted.length).toBeGreaterThan(0)

    expect(issuedKeys).toHaveLength(2)
    expect(deleted).toEqual([issuedKeys[0]])
  })

  it('discards an unsaved upload when it is removed', async () => {
    const component = await mount()

    await selectFile(component)
    await component.get(testId('recipe-form-image-remove')).trigger('click')
    await expect.poll(() => deleted.length).toBeGreaterThan(0)

    expect(deleted).toEqual([issuedKeys[0]])
  })

  it('drops the preview when the image is removed', async () => {
    const component = await mount()

    await selectFile(component)
    await component.get(testId('recipe-form-image-remove')).trigger('click')
    await component.vm.$nextTick()

    expect(component.find(testId('recipe-form-image')).exists()).toBe(false)
    expect(component.find(testId('recipe-form-image-upload')).exists()).toBe(
      true,
    )
  })

  it('keeps a saved image when the discard call is refused', async () => {
    deleteStatus = 409

    const component = await mount({
      initial: { imageKey: RECIPE_IMAGE_KEY },
      imageUrl: 'https://bucket.test/a.webp',
    })

    await component.get(testId('recipe-form-image-remove')).trigger('click')
    await expect.poll(() => deleteAttempts.length).toBeGreaterThan(0)

    expect(deleteAttempts).toEqual([RECIPE_IMAGE_KEY])
    expect(deleted).toEqual([])
    expect(component.find(testId('recipe-form-image')).exists()).toBe(false)
  })

  it('leaves the uploader in place when the upload fails', async () => {
    presignStatus = 503

    const component = await mount()

    await selectFile(component)

    expect(putRequests).toHaveLength(0)
    expect(component.find(testId('recipe-form-image-upload')).exists()).toBe(
      true,
    )
  })
})
