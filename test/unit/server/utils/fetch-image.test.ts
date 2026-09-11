import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRemoteImage } from '~~/server/utils/fetch-image'
import {
  imageResponse,
  neverFetches,
  respondWith,
} from '~~/test/unit/stubs/http'

const bytes = new Uint8Array([1, 2, 3, 4])

beforeEach(() => {
  respondWith(imageResponse(bytes))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRemoteImage', () => {
  it('returns the body and content type', async () => {
    await expect(
      fetchRemoteImage('https://example.test/a.jpg'),
    ).resolves.toEqual({ body: bytes, contentType: 'image/jpeg' })
  })

  it('ignores a charset on the content type', async () => {
    respondWith(imageResponse(bytes, 'image/png; charset=binary'))

    const result = await fetchRemoteImage('https://example.test/a.png')

    expect(result?.contentType).toBe('image/png')
  })

  it('refuses urls the ssrf guard rejects without fetching', async () => {
    const fetchSpy = neverFetches()

    await expect(
      fetchRemoteImage('http://169.254.169.254/latest/meta-data'),
    ).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('gives up on an error response', async () => {
    respondWith(new Response(null, { status: 403 }))

    await expect(
      fetchRemoteImage('https://example.test/a.jpg'),
    ).resolves.toBeUndefined()
  })

  it('rejects image types the app does not store', async () => {
    respondWith(imageResponse(bytes, 'image/svg+xml'))

    await expect(
      fetchRemoteImage('https://example.test/a.svg'),
    ).resolves.toBeUndefined()
  })

  it('rejects a response that is not an image at all', async () => {
    respondWith(imageResponse(bytes, 'text/html'))

    await expect(
      fetchRemoteImage('https://example.test/a.jpg'),
    ).resolves.toBeUndefined()
  })

  it('rejects a response with no content type', async () => {
    respondWith(new Response(bytes))

    await expect(
      fetchRemoteImage('https://example.test/a.jpg'),
    ).resolves.toBeUndefined()
  })

  it('rejects an oversized image before downloading it', async () => {
    respondWith(imageResponse(bytes, 'image/jpeg', 6_000_000))

    await expect(
      fetchRemoteImage('https://example.test/huge.jpg'),
    ).resolves.toBeUndefined()
  })

  it('rejects an image that lies about its length', async () => {
    respondWith(imageResponse(new Uint8Array(5_000_001), 'image/jpeg', 10))

    await expect(
      fetchRemoteImage('https://example.test/huge.jpg'),
    ).resolves.toBeUndefined()
  })

  it('returns undefined when the request throws', async () => {
    respondWith(new Error('network down'))

    await expect(
      fetchRemoteImage('https://example.test/a.jpg'),
    ).resolves.toBeUndefined()
  })
})
