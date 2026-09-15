import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPageHtml } from '~~/server/utils/fetch-page'
import {
  endlessStream,
  htmlResponse,
  neverFetches,
  respondInOrder,
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

  it('accepts an html body even without a content type', async () => {
    respondWith(new Response('<html><body>hi</body></html>'))

    await expect(fetchPageHtml('https://example.test/x')).resolves.toBe(
      '<html><body>hi</body></html>',
    )
  })

  it('ignores a body with no content type that is not html', async () => {
    respondWith(new Response('just some text'))

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

describe('fetchPageHtml reader fallback', () => {
  it('sends browser headers on the direct request', async () => {
    const calls = respondInOrder([htmlResponse('<html>ok</html>')])

    await fetchPageHtml('https://example.test/recipe')

    expect(calls).toHaveLength(1)
    expect(calls[0]!.headers['user-agent']).toContain('Chrome')
    expect(calls[0]!.headers['sec-fetch-mode']).toBe('navigate')
    expect(calls[0]!.headers.referer).toBe('https://example.test/')
  })

  it('retries through the reader when the site blocks the direct fetch', async () => {
    const calls = respondInOrder([
      new Response('denied', { status: 403 }),
      new Response('<html><body>recept</body></html>', {
        headers: { 'content-type': 'text/plain' },
      }),
    ])

    await expect(fetchPageHtml('https://example.test/recipe')).resolves.toBe(
      '<html><body>recept</body></html>',
    )
    expect(calls).toHaveLength(2)
    expect(calls[1]!.url).toBe('https://r.jina.ai/https://example.test/recipe')
    expect(calls[1]!.headers['x-respond-with']).toBe('html')
  })

  it('does not call the reader when the direct fetch succeeds', async () => {
    const calls = respondInOrder([htmlResponse('<html>ok</html>')])

    await fetchPageHtml('https://example.test/recipe')

    expect(calls).toHaveLength(1)
  })

  it('gives up when the reader also fails', async () => {
    respondInOrder([
      new Response('denied', { status: 403 }),
      new Response('denied', { status: 451 }),
    ])

    await expect(
      fetchPageHtml('https://example.test/recipe'),
    ).resolves.toBeUndefined()
  })

  it('never sends a blocked url to the reader', async () => {
    const fetchSpy = neverFetches()

    await expect(
      fetchPageHtml('http://169.254.169.254/latest/meta-data'),
    ).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
