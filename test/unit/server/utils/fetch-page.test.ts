import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPageHtml } from '~~/server/utils/fetch-page'
import {
  endlessStream,
  htmlResponse,
  neverFetches,
  respondWith,
} from '~~/test/unit/stubs/http'

beforeEach(() => {
  respondWith(htmlResponse('<html><body>hi</body></html>'))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPageHtml', () => {
  it('returns the page body', async () => {
    await expect(fetchPageHtml('https://example.test/recipe')).resolves.toBe(
      '<html><body>hi</body></html>',
    )
  })

  it('refuses urls the ssrf guard rejects without fetching', async () => {
    const fetchSpy = neverFetches()

    await expect(
      fetchPageHtml('http://localhost/admin'),
    ).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('gives up on an error response', async () => {
    respondWith(new Response('nope', { status: 404 }))

    await expect(
      fetchPageHtml('https://example.test/x'),
    ).resolves.toBeUndefined()
  })

  it('ignores responses that are not html', async () => {
    respondWith(htmlResponse('{}', 'application/json'))

    await expect(
      fetchPageHtml('https://example.test/x'),
    ).resolves.toBeUndefined()
  })

  it('ignores a response with no content type', async () => {
    respondWith(new Response('<html></html>'))

    await expect(
      fetchPageHtml('https://example.test/x'),
    ).resolves.toBeUndefined()
  })

  it('returns undefined when the request throws', async () => {
    respondWith(new Error('network down'))

    await expect(
      fetchPageHtml('https://example.test/x'),
    ).resolves.toBeUndefined()
  })

  it('stops reading once the byte cap is reached', async () => {
    const { body, counter } = endlessStream('a'.repeat(100_000))

    respondWith(
      new Response(body, { headers: { 'content-type': 'text/html' } }),
    )

    const result = await fetchPageHtml('https://example.test/huge')

    expect(result!.length).toBeGreaterThanOrEqual(2_000_000)
    expect(counter.chunks).toBeLessThan(30)
  })
})
